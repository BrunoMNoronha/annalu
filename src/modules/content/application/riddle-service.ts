import type { RiddleRepository } from '@/modules/content/application/ports';
import type { Riddle } from '@/modules/content/domain/riddle';
import { validateRiddlePrompt } from '@/modules/content/domain/riddle';

/** Cria uma charada vinculada a uma palavra existente. */
export async function createRiddle(
  repository: RiddleRepository,
  input: { wordId: string; prompt: string },
): Promise<Riddle> {
  const prompt = validateRiddlePrompt(input.prompt);
  return repository.create({ wordId: input.wordId, prompt });
}

/** Ativa a charada. */
export function activateRiddle(
  repository: RiddleRepository,
  id: string,
): Promise<Riddle> {
  return repository.setStatus(id, 'ACTIVE');
}

/** Desativa a charada (preserva histórico). */
export function deactivateRiddle(
  repository: RiddleRepository,
  id: string,
): Promise<Riddle> {
  return repository.setStatus(id, 'INACTIVE');
}
