/**
 * Erros explícitos da camada de conteúdo. São o contrato público para condições
 * previsíveis; NUNCA se expõe mensagem/código interno do Prisma/PostgreSQL.
 */

/** Base de todos os erros do módulo de conteúdo. */
export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidWordTextError extends ContentError {
  constructor() {
    super('Word text must not be empty.');
  }
}

export class InvalidRiddlePromptError extends ContentError {
  constructor() {
    super('Riddle prompt must not be empty.');
  }
}

export class InvalidAcceptedAnswerError extends ContentError {
  constructor() {
    super('Accepted answer text must not be empty.');
  }
}

export class DuplicateAcceptedAnswerError extends ContentError {
  constructor() {
    super(
      'An accepted answer with the same normalized text already exists for this riddle.',
    );
  }
}

export class WordNotFoundError extends ContentError {
  constructor(id: string) {
    super(`Word not found: ${id}`);
  }
}

export class RiddleNotFoundError extends ContentError {
  constructor(id: string) {
    super(`Riddle not found: ${id}`);
  }
}
