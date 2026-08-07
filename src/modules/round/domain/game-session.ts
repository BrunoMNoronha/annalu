import { InvalidGameSessionStateTransitionError } from '@/modules/round/domain/errors';
import type { SessionChallengeState } from '@/modules/round/domain/session-challenge-state';

/**
 * Estado de uma rodada. Espelha o enum físico `GameSessionStatus` do Prisma sem
 * acoplar o domínio ao cliente gerado. Modelo de estados em docs/04:
 * `CREATED → IN_PROGRESS → (COMPLETED | EXPIRED | CANCELLED)`. Nesta fatia só
 * são implementadas a criação (`CREATED`) e o início (`→ IN_PROGRESS`).
 */
export type GameSessionStatus =
  'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

/** Desafio da rodada (visão de domínio; sem acoplamento ao Prisma). */
export interface SessionChallenge {
  readonly id: string;
  readonly riddleId: string;
  /** Posição 1..N dentro da rodada (única por sessão). */
  readonly position: number;
  readonly state: SessionChallengeState;
}

/**
 * Rodada jogada por um jogador identificado. Guarda os **snapshots** da
 * configuração vigente na criação (a regra da rodada usa estes valores, não a
 * configuração viva) e referencia a configuração de origem por `configurationId`
 * para rastreabilidade (ver docs/14 e RN-ROD-004).
 */
export interface GameSession {
  readonly id: string;
  readonly playerId: string;
  readonly configurationId: string;
  readonly status: GameSessionStatus;
  readonly pointsPerApprovalSnapshot: number;
  readonly uploadGraceSecondsSnapshot: number;
  readonly challengesCountSnapshot: number;
  readonly timeLimitSecondsSnapshot: number;
  readonly startedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly challenges: readonly SessionChallenge[];
}

/**
 * Garante que a rodada pode ser iniciada: só `CREATED → IN_PROGRESS` é válido
 * (docs/04). Lança `InvalidGameSessionStateTransitionError` caso contrário.
 */
export function assertCanStart(status: GameSessionStatus): void {
  if (status !== 'CREATED') {
    throw new InvalidGameSessionStateTransitionError(status, 'IN_PROGRESS');
  }
}

/**
 * Calcula o instante de expiração a partir do `startedAt` (relógio do SERVIDOR)
 * e do `timeLimitSecondsSnapshot`. O tempo restante nunca deriva do relógio do
 * cliente (RN-TMP-002). Função pura para permitir teste determinístico.
 */
export function computeExpiresAt(
  startedAt: Date,
  timeLimitSeconds: number,
): Date {
  return new Date(startedAt.getTime() + timeLimitSeconds * 1000);
}
