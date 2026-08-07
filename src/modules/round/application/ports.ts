import type { SelectedChallenge } from '@/modules/round/domain/challenge-selection';
import type { GameSession } from '@/modules/round/domain/game-session';

/**
 * Ports (interfaces) da camada de aplicação da rodada. A aplicação depende
 * SOMENTE destas abstrações — nunca do `PrismaClient`. Os adapters de
 * infraestrutura as implementam e traduzem violações do banco para erros de
 * domínio. A leitura de configuração vigente e do acervo ativo reutiliza os
 * ports do módulo `content` (não são duplicados aqui).
 *
 * As transições de estado são **compare-and-set atômicos** (`startIfCreated`,
 * `expireIfDue`): a condição de estado faz parte da escrita, eliminando o TOCTOU
 * de `findById → validar → update`.
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

export interface ExpireGameSessionInput {
  readonly sessionId: string;
  /** Instante atual (relógio do servidor) comparado a `expiresAt`. */
  readonly now: Date;
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
   * **Compare-and-set atômico** `CREATED → IN_PROGRESS`: aplica a transição e
   * grava `startedAt`/`expiresAt` **somente se** o estado ainda for `CREATED`.
   * Retorna a sessão atualizada quando venceu, ou `null` quando não estava em
   * `CREATED` (não sobrescreve `startedAt`/`expiresAt` da vencedora).
   */
  startIfCreated(input: StartGameSessionInput): Promise<GameSession | null>;

  /**
   * **Compare-and-set atômico** `IN_PROGRESS → EXPIRED`: aplica a transição
   * **somente se** o estado for `IN_PROGRESS` **e** `expires_at <= now`,
   * gravando `endedAt = expiresAt` no nível do banco. Retorna a sessão
   * atualizada quando venceu, ou `null` quando não venceu (não vencida ou já
   * transicionada por concorrente). Idempotente.
   */
  expireIfDue(input: ExpireGameSessionInput): Promise<GameSession | null>;
}
