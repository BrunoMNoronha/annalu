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
 * Expira uma rodada **se vencida** (`now >= expiresAt`), sem worker/cron —
 * reutilizável por route handler, consulta de sessão ou job futuro.
 *
 * - Sessão inexistente → `GameSessionNotFoundError`.
 * - `IN_PROGRESS` e vencida → **compare-and-set atômico** `IN_PROGRESS → EXPIRED`
 *   com `endedAt = expiresAt` (NUNCA `Clock.now()`); `expiredNow = true`.
 * - `IN_PROGRESS` não vencida (`now < expiresAt`) → nada muda; `expiredNow = false`.
 * - Já `EXPIRED` → **idempotente**: preserva `endedAt`/`expiresAt`, sem nova
 *   transição; `expiredNow = false`.
 * - `CREATED`/`COMPLETED`/`CANCELLED` → estado incompatível: **não** altera;
 *   `expiredNow = false` (não reabre estados terminais).
 *
 * A decisão de vencimento e a transição são protegidas contra concorrência pelo
 * compare-and-set do repositório (`status = 'IN_PROGRESS' AND expires_at <= now`).
 * O `findById` inicial serve apenas para classificar o retorno — não é a garantia
 * de atomicidade.
 */
export async function expireRoundIfDue(
  deps: ExpireRoundDependencies,
  input: { sessionId: string },
): Promise<ExpireRoundResult> {
  const session = await deps.sessions.findById(input.sessionId);
  if (!session) {
    throw new GameSessionNotFoundError(input.sessionId);
  }

  // Estados incompatíveis e idempotência: nenhuma escrita.
  if (session.status !== 'IN_PROGRESS') {
    return { session, expiredNow: false };
  }

  const now = deps.clock.now();
  const expired = await deps.sessions.expireIfDue({
    sessionId: session.id,
    now,
  });
  if (expired) {
    return { session: expired, expiredNow: true };
  }

  // Não venceu: não estava vencida OU um concorrente já expirou. Reobtém o
  // estado atual observável para o retorno (sem nova escrita).
  const current = await deps.sessions.findById(input.sessionId);
  return { session: current ?? session, expiredNow: false };
}
