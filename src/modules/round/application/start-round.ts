import type { GameSessionRepository } from '@/modules/round/application/ports';
import {
  GameSessionNotFoundError,
  InvalidGameSessionStateTransitionError,
} from '@/modules/round/domain/errors';
import {
  assertCanStart,
  computeExpiresAt,
} from '@/modules/round/domain/game-session';
import type { GameSession } from '@/modules/round/domain/game-session';
import type { Clock } from '@/shared/clock/clock';

/** Dependências injetadas em `startRound`. */
export interface StartRoundDependencies {
  readonly sessions: GameSessionRepository;
  readonly clock: Clock;
}

/**
 * Inicia uma rodada existente:
 *
 * 1. carrega a rodada (erro se não existir) e valida a transição para uma
 *    mensagem de erro clara no caminho comum;
 * 2. registra `startedAt` pelo **relógio do servidor** (`Clock`) e calcula
 *    `expiresAt = startedAt + timeLimitSecondsSnapshot` no servidor (RN-TMP-002);
 * 3. aplica a transição via **compare-and-set atômico** `CREATED → IN_PROGRESS`.
 *
 * A garantia final contra concorrência é o compare-and-set (não o
 * `findById → validar → update`): em duas chamadas concorrentes, **exatamente
 * uma** vence; a perdedora **não** sobrescreve `startedAt`/`expiresAt` e recebe
 * `InvalidGameSessionStateTransitionError`.
 */
export async function startRound(
  deps: StartRoundDependencies,
  input: { sessionId: string },
): Promise<GameSession> {
  const session = await deps.sessions.findById(input.sessionId);
  if (!session) {
    throw new GameSessionNotFoundError(input.sessionId);
  }
  assertCanStart(session.status);

  const startedAt = deps.clock.now();
  const expiresAt = computeExpiresAt(
    startedAt,
    session.timeLimitSecondsSnapshot,
  );

  const started = await deps.sessions.startIfCreated({
    sessionId: session.id,
    startedAt,
    expiresAt,
  });
  if (started) {
    return started;
  }

  // Perdeu a corrida: outra chamada iniciou entre o findById e o compare-and-set.
  const current = await deps.sessions.findById(input.sessionId);
  throw new InvalidGameSessionStateTransitionError(
    current?.status ?? 'UNKNOWN',
    'IN_PROGRESS',
  );
}
