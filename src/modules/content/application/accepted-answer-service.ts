import type { AcceptedAnswerRepository } from '@/modules/content/application/ports';
import type { AcceptedAnswer } from '@/modules/content/domain/accepted-answer';
import {
  assertNonEmptyAnswer,
  normalizeAnswerText,
} from '@/modules/content/domain/accepted-answer';
import { DuplicateAcceptedAnswerError } from '@/modules/content/domain/errors';

/**
 * Adiciona uma resposta aceita a uma charada.
 *
 * Defesa em profundidade: faz uma checagem amigável de duplicidade, mas a
 * garantia final é a unique constraint `(riddle_id, normalized_text)` do banco —
 * o adapter traduz a violação em `DuplicateAcceptedAnswerError` (o `create` do
 * port também pode lançá-lo sob concorrência). O texto original é preservado.
 */
export async function addAcceptedAnswer(
  repository: AcceptedAnswerRepository,
  input: { riddleId: string; text: string },
): Promise<AcceptedAnswer> {
  assertNonEmptyAnswer(input.text);
  const normalizedText = normalizeAnswerText(input.text);

  const existing = await repository.listByRiddle(input.riddleId);
  if (existing.some((answer) => answer.normalizedText === normalizedText)) {
    throw new DuplicateAcceptedAnswerError();
  }

  return repository.create({
    riddleId: input.riddleId,
    text: input.text,
    normalizedText,
  });
}

/** Lista as respostas aceitas de uma charada. */
export function listAnswers(
  repository: AcceptedAnswerRepository,
  riddleId: string,
): Promise<AcceptedAnswer[]> {
  return repository.listByRiddle(riddleId);
}
