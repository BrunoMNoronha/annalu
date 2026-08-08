/**
 * Erros explícitos da camada de rodada (`GameSession`). São o contrato público
 * para condições previsíveis; NUNCA se expõe mensagem/código interno do
 * Prisma/PostgreSQL.
 */

/** Base de todos os erros do módulo de rodada. */
export class RoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Não há configuração vigente (`isCurrent = true`). A rodada não é criada e
 * nenhum default de aplicação é inventado (a configuração é fonte da verdade).
 */
export class NoCurrentConfigurationError extends RoundError {
  constructor() {
    super('No current game configuration is available.');
  }
}

/**
 * HIPÓTESE técnica provisória e reversível para **RN-SEL-003** (acervo
 * insuficiente): quando há menos charadas elegíveis do que `challengesPerRound`,
 * a criação falha ANTES de persistir qualquer `GameSession`/`SessionChallenge`.
 * NÃO é a decisão definitiva de produto — RN-SEL-003 permanece PENDENTE.
 */
export class InsufficientActiveContentError extends RoundError {
  constructor(
    readonly available: number,
    readonly required: number,
  ) {
    super(
      `Insufficient eligible content for a round: ${available} available, ${required} required.`,
    );
  }
}

/** O `playerId` informado não corresponde a um jogador existente. */
export class PlayerNotFoundError extends RoundError {
  constructor(id: string) {
    super(`Player not found: ${id}`);
  }
}

/** A rodada (`GameSession`) não existe. */
export class GameSessionNotFoundError extends RoundError {
  constructor(id: string) {
    super(`Game session not found: ${id}`);
  }
}

/** Transição de estado inválida no modelo da rodada (ver docs/04). */
export class InvalidGameSessionStateTransitionError extends RoundError {
  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super(`Invalid game session state transition: ${from} -> ${to}.`);
  }
}

/**
 * A rodada não pode ser editada no estado atual (não está `IN_PROGRESS` dentro
 * do prazo). NUNCA inclui o texto da resposta na mensagem.
 */
export class GameSessionNotEditableError extends RoundError {
  constructor(readonly status: string) {
    super(`Game session is not editable in its current state: ${status}.`);
  }
}

/** O `SessionChallenge` informado não existe. */
export class SessionChallengeNotFoundError extends RoundError {
  constructor(id: string) {
    super(`Session challenge not found: ${id}`);
  }
}

/** O `SessionChallenge` não pertence à `GameSession` informada. */
export class SessionChallengeMismatchError extends RoundError {
  constructor() {
    super('Session challenge does not belong to the given session.');
  }
}

/**
 * A resposta existente não está em `DRAFT` (não pode ser sobrescrita nesta
 * fatia). Expõe apenas o estado — NUNCA o texto da resposta.
 */
export class PlayerAnswerNotDraftError extends RoundError {
  constructor(readonly state: string) {
    super(`Player answer is not editable (state: ${state}).`);
  }
}
