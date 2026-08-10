import type { PrismaClient } from '@prisma/client';
import type {
  PlayerAnswer,
  PlayerAnswerDraftRepository,
  PlayerAnswerState,
  SaveAnswerDraftInput,
} from '@/modules/round';
import {
  GameSessionNotEditableError,
  GameSessionNotFoundError,
  PlayerAnswerNotDraftError,
  SessionChallengeMismatchError,
  SessionChallengeNotFoundError,
} from '@/modules/round';
import { expireDueSql } from '@/infrastructure/prisma/round/expire-due';

interface PlayerAnswerRow {
  id: string;
  sessionChallengeId: string;
  answerText: string;
  state: PlayerAnswerState;
  submittedAt: Date | null;
}

function toPlayerAnswer(row: PlayerAnswerRow): PlayerAnswer {
  return {
    id: row.id,
    sessionChallengeId: row.sessionChallengeId,
    answerText: row.answerText,
    state: row.state,
    submittedAt: row.submittedAt,
  };
}

interface LockedSessionRow {
  status: string;
  expires_at: Date | null;
}

type SaveOutcome =
  | { kind: 'saved'; answer: PlayerAnswer }
  | { kind: 'not-found' }
  | { kind: 'not-editable'; status: string }
  | { kind: 'challenge-not-found' }
  | { kind: 'mismatch' }
  | { kind: 'not-draft'; state: PlayerAnswerState };

/**
 * Adapter Prisma do `PlayerAnswerDraftRepository`.
 *
 * **Coordenação save × expiração (garantia final):** tudo ocorre em UMA
 * transação interativa que primeiro faz `SELECT ... FOR UPDATE` na linha da
 * `GameSession` (lock), revalida `status = IN_PROGRESS` e `expires_at > now`,
 * confere que o `SessionChallenge` pertence à sessão e então cria/atualiza o
 * `PlayerAnswer` em `DRAFT`. A expiração `IN_PROGRESS → EXPIRED` disputa o mesmo
 * lock, então: se o save vence, o texto é persistido e a expiração ocorre depois;
 * se a expiração vence, o save observa `EXPIRED` e não altera o texto. O texto é
 * gravado **literalmente** (sem normalização). Nenhuma coluna extra além de
 * `game_sessions` é travada.
 */
export class PrismaPlayerAnswerRepository implements PlayerAnswerDraftRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveDraft(input: SaveAnswerDraftInput): Promise<PlayerAnswer> {
    const outcome: SaveOutcome = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<LockedSessionRow[]>`
        SELECT "status"::text AS status, "expires_at" AS expires_at
        FROM "game_sessions"
        WHERE "id" = ${input.sessionId}::uuid
        FOR UPDATE
      `;
      const session = locked[0];
      if (!session) {
        return { kind: 'not-found' };
      }
      if (session.status !== 'IN_PROGRESS') {
        return { kind: 'not-editable', status: session.status };
      }
      if (
        session.expires_at === null ||
        input.now.getTime() >= session.expires_at.getTime()
      ) {
        // Vencida sob o lock: aplica a expiração na MESMA transação (commita) e
        // rejeita a escrita — estado observável coerente como EXPIRED.
        await expireDueSql(tx, input.sessionId, input.now);
        return { kind: 'not-editable', status: 'EXPIRED' };
      }

      const challenge = await tx.sessionChallenge.findUnique({
        where: { id: input.challengeId },
        select: { id: true, sessionId: true },
      });
      if (!challenge) {
        return { kind: 'challenge-not-found' };
      }
      if (challenge.sessionId !== input.sessionId) {
        return { kind: 'mismatch' };
      }

      const existing = await tx.playerAnswer.findUnique({
        where: { sessionChallengeId: input.challengeId },
        select: { id: true, state: true },
      });
      if (existing && existing.state !== 'DRAFT') {
        return { kind: 'not-draft', state: existing.state };
      }

      const row = existing
        ? await tx.playerAnswer.update({
            where: { sessionChallengeId: input.challengeId },
            data: { answerText: input.answerText },
          })
        : await tx.playerAnswer.create({
            data: {
              sessionChallengeId: input.challengeId,
              answerText: input.answerText,
              state: 'DRAFT',
            },
          });
      return { kind: 'saved', answer: toPlayerAnswer(row) };
    });

    switch (outcome.kind) {
      case 'saved':
        return outcome.answer;
      case 'not-found':
        throw new GameSessionNotFoundError(input.sessionId);
      case 'not-editable':
        throw new GameSessionNotEditableError(outcome.status);
      case 'challenge-not-found':
        throw new SessionChallengeNotFoundError(input.challengeId);
      case 'mismatch':
        throw new SessionChallengeMismatchError();
      case 'not-draft':
        throw new PlayerAnswerNotDraftError(outcome.state);
    }
  }
}
