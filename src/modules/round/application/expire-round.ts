import type { GameSessionRepository } from '@/modules/round/application/ports';
import { GameSessionNotFoundError } from '@/modules/round/domain/errors';
import type { GameSession } from '@/modules/round/domain/game-session';
import type { Clock } from '@/shared/clock/clock';

/** Dependências injetadas em `expireRoundIfDue`. */
export interface ExpireRoundDependencies {
  readonly sessions: GameSessionRepository;
  readonly clock: Clock;
}

/**
 * Resultado da tentativa de expiração. `expiredNow` é `true` apenas quando ESTA
 * chamada aplicou a transição `IN_PROGRESS → EXPIRED`; em chamadas repetidas
 * (idempotência) ou em estados incompatíveis, é `false`.
 */
export interface ExpireRoundResult {
  readonly session: GameSession;
  readonly expiredNow: boolean;
}

/**
 * Primitiva de expiração com um `now` **já capturado** (autoridade temporal
 * única): não chama o `Clock`. Permite que um chamador (ex.: `getRoundState`)
 * compartilhe o mesmo `serverNow` entre a avaliação de expiração, o cálculo do
 * tempo restante e a resposta — sem duplicar a regra de expiração.
 *
 * - Sessão inexistente → `GameSessionNotFoundError`.
 * - `IN_PROGRESS` e vencida (`now >= expiresAt`) → **compare-and-set atômico**
 *   `IN_PROGRESS → EXPIRED` com `endedAt = expiresAt`; `expiredNow = true`.
 * - `IN_PROGRESS` não vencida → nada muda; `expiredNow = false`.
 * - Já `EXPIRED` → idempotente; `expiredNow = false`.
 * - `CREATED`/`COMPLETED`/`CANCELLED` → estado incompatível: não altera; não
 *   reabre estados terminais; `expiredNow = false`.
 *
 * A decisão de vencimento e a transição são protegidas contra concorrência pelo
 * compare-and-set do repositório (`status = 'IN_PROGRESS' AND expires_at <= now`).
 * O `findById` inicial serve apenas para classificar o retorno.
 */
export async function expireRoundAt(
  sessions: GameSessionRepository,
  input: { sessionId: string; now: Date },
): Promise<ExpireRoundResult> {
  const session = await sessions.findById(input.sessionId);
  if (!session) {
    throw new GameSessionNotFoundError(input.sessionId);
  }

  if (session.status !== 'IN_PROGRESS') {
    return { session, expiredNow: false };
  }

  const expired = await sessions.expireIfDue({
    sessionId: session.id,
    now: input.now,
  });
  if (expired) {
    return { session: expired, expiredNow: true };
  }

  const current = await sessions.findById(input.sessionId);
  return { session: current ?? session, expiredNow: false };
}

/**
 * Expira uma rodada **se vencida** (`now >= expiresAt`), sem worker/cron —
 * reutilizável por route handler, consulta de sessão ou job futuro. Captura o
 * `serverNow` do `Clock` e delega para `expireRoundAt`.
 */
export async function expireRoundIfDue(
  deps: ExpireRoundDependencies,
  input: { sessionId: string },
): Promise<ExpireRoundResult> {
  return expireRoundAt(deps.sessions, {
    sessionId: input.sessionId,
    now: deps.clock.now(),
  });
}
