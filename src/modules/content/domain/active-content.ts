import type { AcceptedAnswer } from '@/modules/content/domain/accepted-answer';
import type { Riddle } from '@/modules/content/domain/riddle';
import type { Word } from '@/modules/content/domain/word';

/** Charada ativa com suas respostas aceitas. */
export interface ActiveRiddle {
  readonly riddle: Riddle;
  readonly acceptedAnswers: readonly AcceptedAnswer[];
}

/**
 * Palavra ativa com suas charadas ativas — base elegível para a futura seleção
 * de rodada. NÃO inclui seleção aleatória nem qualquer política de pool
 * insuficiente (fora de escopo).
 */
export interface ActiveContent {
  readonly word: Word;
  readonly riddles: readonly ActiveRiddle[];
}
