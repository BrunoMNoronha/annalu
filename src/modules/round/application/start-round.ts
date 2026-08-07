import type { GameSessionRepository } from '@/modules/round/application/ports';
import { GameSessionNotFoundError } from '@/modules/round/domain/errors';
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
 * 1. carrega a rodada (erro se não existir);
 * 2. valida a transição de estado `CREATED → IN_PROGRESS` (docs/04);
 * 3. registra `startedAt` pelo **relógio do servidor** (`Clock`);
 * 4. calcula `expiresAt = startedAt + timeLimitSecondsSnapshot` no servidor
 *    (RN-TMP-002 — nunca a partir do relógio do cliente);
 * 5. persiste o novo estado.
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

  return deps.sessions.start({ sessionId: session.id, startedAt, expiresAt });
}
