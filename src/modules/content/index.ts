/**
 * Ponto de entrada público do módulo "content" (acervo de palavras/charadas/
 * respostas + leitura da configuração vigente). Consumidores externos importam
 * daqui, não dos arquivos internos.
 *
 * Esta fatia é apenas domínio + aplicação + ports; adapters de infraestrutura
 * (Prisma) ficam em `src/infrastructure/prisma/content`. Sem HTTP/UI/auth.
 */

// Serviços de aplicação (casos de uso)
export {
  createWord,
  activateWord,
  deactivateWord,
} from '@/modules/content/application/word-service';
export {
  createRiddle,
  activateRiddle,
  deactivateRiddle,
} from '@/modules/content/application/riddle-service';
export {
  addAcceptedAnswer,
  listAnswers,
} from '@/modules/content/application/accepted-answer-service';
export {
  listActiveContent,
  getCurrentConfiguration,
} from '@/modules/content/application/content-queries';

// Ports (para adapters e testes)
export type {
  WordRepository,
  RiddleRepository,
  AcceptedAnswerRepository,
  ContentCatalogRepository,
  GameConfigurationRepository,
} from '@/modules/content/application/ports';

// Domínio
export type { ContentStatus } from '@/modules/content/domain/content-status';
export type { Word } from '@/modules/content/domain/word';
export { validateWordText } from '@/modules/content/domain/word';
export type { Riddle } from '@/modules/content/domain/riddle';
export { validateRiddlePrompt } from '@/modules/content/domain/riddle';
export type { AcceptedAnswer } from '@/modules/content/domain/accepted-answer';
export {
  normalizeAnswerText,
  assertNonEmptyAnswer,
} from '@/modules/content/domain/accepted-answer';
export type {
  ActiveContent,
  ActiveRiddle,
} from '@/modules/content/domain/active-content';
export type { CurrentGameConfiguration } from '@/modules/content/domain/game-configuration';

// Erros
export {
  ContentError,
  InvalidWordTextError,
  InvalidRiddlePromptError,
  InvalidAcceptedAnswerError,
  DuplicateAcceptedAnswerError,
  WordNotFoundError,
  RiddleNotFoundError,
} from '@/modules/content/domain/errors';
