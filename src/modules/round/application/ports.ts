import type { SelectedChallenge } from '@/modules/round/domain/challenge-selection';
import type { GameSession } from '@/modules/round/domain/game-session';

/**
 * Ports (interfaces) da camada de aplicação da rodada. A aplicação depende
 * SOMENTE destas abstrações — nunca do `PrismaClient`. Os adapters de
 * infraestrutura as implementam e traduzem violações do banco para erros de
 * domínio. A leitura de configuração vigente e do acervo ativo reutiliza os
 * ports do módulo `content` (não são duplicados aqui).
 */

export interface CreateGameSessionInput {
  readonly playerId: string;
  readonly configurationId: string;
  readonly pointsPerApprovalSnapshot: number;
  readonly uploadGraceSecondsSnapshot: number;
  readonly challengesCountSnapshot: number;
  readonly timeLimitSecondsSnapshot: number;
  readonly challenges: readonly SelectedChallenge[];
}

export interface StartGameSessionInput {
  readonly sessionId: string;
  /** Instante de início (relógio do servidor). */
  readonly startedAt: Date;
  /** `startedAt + timeLimitSecondsSnapshot` (calculado no servidor). */
  readonly expiresAt: Date;
}

export interface GameSessionRepository {
  /**
   * Persiste a rodada e seus desafios de forma **atômica** (tudo ou nada).
   * Lança `PlayerNotFoundError` quando o `playerId` não existe (FK). Nenhuma
   * rodada parcial pode permanecer se algum desafio falhar.
   */
  create(input: CreateGameSessionInput): Promise<GameSession>;

  findById(id: string): Promise<GameSession | null>;

  /**
   * Marca a rodada como iniciada (`IN_PROGRESS`) gravando `startedAt`/
   * `expiresAt`. Lança `GameSessionNotFoundError` se o id não existir.
   */
  start(input: StartGameSessionInput): Promise<GameSession>;
}
