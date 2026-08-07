import type { WordRepository } from '@/modules/content/application/ports';
import type { Word } from '@/modules/content/domain/word';
import { validateWordText } from '@/modules/content/domain/word';

/** Cria uma palavra após validar o texto de exibição. */
export async function createWord(
  repository: WordRepository,
  input: { text: string; createdByAdminUserId: string },
): Promise<Word> {
  const text = validateWordText(input.text);
  return repository.create({
    text,
    createdByAdminUserId: input.createdByAdminUserId,
  });
}

/** Ativa a palavra (curadoria por status, sem exclusão). */
export function activateWord(
  repository: WordRepository,
  id: string,
): Promise<Word> {
  return repository.setStatus(id, 'ACTIVE');
}

/** Desativa a palavra (preserva histórico; deixa de entrar no sorteio). */
export function deactivateWord(
  repository: WordRepository,
  id: string,
): Promise<Word> {
  return repository.setStatus(id, 'INACTIVE');
}
