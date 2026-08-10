import { expireRoundAt } from '@/modules/round/application/expire-round';
import type { GameSessionRepository } from '@/modules/round/application/ports';
import type { PlayerAnswerDraftRepository } from '@/modules/round/application/player-answer-ports';
import {
  GameSessionNotEditableError,
  GameSessionNotFoundError,
} from '@/modules/round/domain/errors';
import { classifyDraftEditability } from '@/modules/round/domain/player-answer';
import type { PlayerAnswer } from '@/modules/round/domain/player-answer';
import type { Clock } from '@/shared/clock/clock';

/** Dependências injetadas em `saveAnswerDraft`. */
export interface SaveAnswerDraftDependencies {
  readonly sessions: GameSessionRepository;
  readonly playerAnswers: PlayerAnswerDraftRepository;
  readonly clock: Clock;
}

/**
 * Persiste o texto **literal** que a criança digitou para um `SessionChallenge`,
 * como rascunho (`DRAFT`). Não avalia correção: **não** consulta `AcceptedAnswer`
 * nem `Word.text`, não normaliza e não dá feedback certo/errado.
 *
 * Fluxo:
 * 1. captura um **único** `serverNow` (`Clock`) — o relógio do cliente nunca
 *    participa;
 * 2. carrega a sessão (erro se inexistente);
 * 3. classifica a editabilidade: se `IN_PROGRESS` porém **vencida** (`serverNow
 *    >= expiresAt`), aplica a expiração (estado observável `EXPIRED`, reutilizando
 *    `expireRoundAt`) e rejeita; demais estados não editáveis também rejeitam;
 * 4. delega a **gravação atômica** (`saveDraft`), cuja garantia final contra a
 *    corrida com a expiração é o lock da linha da sessão + revalidação na mesma
 *    transação.
 *
 * O texto é preservado exatamente como recebido (inclusive `""`). A operação não
 * altera `SessionChallenge.state` nem inicia/reabre a sessão.
 */
export async function saveAnswerDraft(
  deps: SaveAnswerDraftDependencies,
  input: { sessionId: string; challengeId: string; answerText: string },
): Promise<PlayerAnswer> {
  const now = deps.clock.now();

  const session = await deps.sessions.findById(input.sessionId);
  if (!session) {
    throw new GameSessionNotFoundError(input.sessionId);
  }

  const editability = classifyDraftEditability(
    session.status,
    session.expiresAt,
    now,
  );
  if (!editability.editable) {
    if (editability.reason === 'EXPIRED_DUE') {
      // Vencida embora persistida `IN_PROGRESS`: aplica a expiração (não duplica
      // a regra temporal) e rejeita a escrita.
      await expireRoundAt(deps.sessions, { sessionId: input.sessionId, now });
      throw new GameSessionNotEditableError('EXPIRED');
    }
    throw new GameSessionNotEditableError(session.status);
  }

  return deps.playerAnswers.saveDraft({
    sessionId: input.sessionId,
    challengeId: input.challengeId,
    answerText: input.answerText,
    now,
  });
}
