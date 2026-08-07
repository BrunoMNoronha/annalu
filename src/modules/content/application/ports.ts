import type { AcceptedAnswer } from '@/modules/content/domain/accepted-answer';
import type { ActiveContent } from '@/modules/content/domain/active-content';
import type { ContentStatus } from '@/modules/content/domain/content-status';
import type { CurrentGameConfiguration } from '@/modules/content/domain/game-configuration';
import type { Riddle } from '@/modules/content/domain/riddle';
import type { Word } from '@/modules/content/domain/word';

/**
 * Ports (interfaces) da camada de aplicação. A aplicação depende SOMENTE destas
 * abstrações — nunca do `PrismaClient`. Os adapters de infraestrutura as
 * implementam e traduzem violações do banco para os erros de domínio.
 */

export interface WordRepository {
  create(input: { text: string; createdByAdminUserId: string }): Promise<Word>;
  findById(id: string): Promise<Word | null>;
  /** Atualiza o status; lança `WordNotFoundError` se o id não existir. */
  setStatus(id: string, status: ContentStatus): Promise<Word>;
}

export interface RiddleRepository {
  /** Cria a charada; lança `WordNotFoundError` se a palavra não existir. */
  create(input: { wordId: string; prompt: string }): Promise<Riddle>;
  findById(id: string): Promise<Riddle | null>;
  /** Atualiza o status; lança `RiddleNotFoundError` se o id não existir. */
  setStatus(id: string, status: ContentStatus): Promise<Riddle>;
}

export interface AcceptedAnswerRepository {
  /**
   * Persiste a resposta aceita. Lança `DuplicateAcceptedAnswerError` na
   * violação de unicidade `(riddleId, normalizedText)` e `RiddleNotFoundError`
   * quando a charada não existe.
   */
  create(input: {
    riddleId: string;
    text: string;
    normalizedText: string;
  }): Promise<AcceptedAnswer>;
  listByRiddle(riddleId: string): Promise<AcceptedAnswer[]>;
}

export interface ContentCatalogRepository {
  /** Palavras ativas com charadas ativas e respostas aceitas vinculadas. */
  listActiveContent(): Promise<ActiveContent[]>;
}

export interface GameConfigurationRepository {
  /** Configuração vigente (`isCurrent = true`) ou `null` se não houver. */
  getCurrent(): Promise<CurrentGameConfiguration | null>;
}
