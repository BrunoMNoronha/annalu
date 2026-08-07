import { describe, expect, it } from 'vitest';
import {
  activateWord,
  createWord,
  deactivateWord,
} from '@/modules/content/application/word-service';
import type { WordRepository } from '@/modules/content/application/ports';
import type { ContentStatus } from '@/modules/content/domain/content-status';
import { InvalidWordTextError } from '@/modules/content/domain/errors';
import type { Word } from '@/modules/content/domain/word';

class FakeWordRepository implements WordRepository {
  public readonly createdInputs: Array<{
    text: string;
    createdByAdminUserId: string;
  }> = [];
  public readonly statusCalls: Array<{ id: string; status: ContentStatus }> =
    [];

  create(input: { text: string; createdByAdminUserId: string }): Promise<Word> {
    this.createdInputs.push(input);
    return Promise.resolve({
      id: 'word-1',
      text: input.text,
      status: 'ACTIVE',
      createdByAdminUserId: input.createdByAdminUserId,
    });
  }

  findById(): Promise<Word | null> {
    return Promise.resolve(null);
  }

  setStatus(id: string, status: ContentStatus): Promise<Word> {
    this.statusCalls.push({ id, status });
    return Promise.resolve({
      id,
      text: 'copo',
      status,
      createdByAdminUserId: 'admin-1',
    });
  }
}

describe('createWord', () => {
  it('valida e cria com o texto (trim de extremidades)', async () => {
    const repo = new FakeWordRepository();
    const word = await createWord(repo, {
      text: '  copo ',
      createdByAdminUserId: 'admin-1',
    });
    expect(word.text).toBe('copo');
    expect(repo.createdInputs[0]?.text).toBe('copo');
  });

  it('rejeita texto vazio antes de tocar o repositório', async () => {
    const repo = new FakeWordRepository();
    await expect(
      createWord(repo, { text: '   ', createdByAdminUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(InvalidWordTextError);
    expect(repo.createdInputs).toHaveLength(0);
  });
});

describe('activateWord/deactivateWord', () => {
  it('delegam o status correto ao repositório', async () => {
    const repo = new FakeWordRepository();
    await activateWord(repo, 'word-1');
    await deactivateWord(repo, 'word-1');
    expect(repo.statusCalls).toEqual([
      { id: 'word-1', status: 'ACTIVE' },
      { id: 'word-1', status: 'INACTIVE' },
    ]);
  });
});
