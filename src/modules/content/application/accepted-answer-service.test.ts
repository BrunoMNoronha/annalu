import { describe, expect, it } from 'vitest';
import {
  addAcceptedAnswer,
  listAnswers,
} from '@/modules/content/application/accepted-answer-service';
import type { AcceptedAnswerRepository } from '@/modules/content/application/ports';
import type { AcceptedAnswer } from '@/modules/content/domain/accepted-answer';
import {
  DuplicateAcceptedAnswerError,
  InvalidAcceptedAnswerError,
} from '@/modules/content/domain/errors';

/** Fake com unicidade `(riddleId, normalizedText)` (última linha de defesa). */
class FakeAcceptedAnswerRepository implements AcceptedAnswerRepository {
  private readonly store: AcceptedAnswer[] = [];

  create(input: {
    riddleId: string;
    text: string;
    normalizedText: string;
  }): Promise<AcceptedAnswer> {
    const duplicate = this.store.some(
      (a) =>
        a.riddleId === input.riddleId &&
        a.normalizedText === input.normalizedText,
    );
    if (duplicate) {
      return Promise.reject(new DuplicateAcceptedAnswerError());
    }
    const answer: AcceptedAnswer = {
      id: `answer-${this.store.length + 1}`,
      riddleId: input.riddleId,
      text: input.text,
      normalizedText: input.normalizedText,
    };
    this.store.push(answer);
    return Promise.resolve(answer);
  }

  listByRiddle(riddleId: string): Promise<AcceptedAnswer[]> {
    return Promise.resolve(this.store.filter((a) => a.riddleId === riddleId));
  }
}

describe('addAcceptedAnswer', () => {
  it('preserva o texto original e persiste o normalizado', async () => {
    const repo = new FakeAcceptedAnswerRepository();
    const answer = await addAcceptedAnswer(repo, {
      riddleId: 'riddle-1',
      text: '  Copo ',
    });
    expect(answer.text).toBe('  Copo ');
    expect(answer.normalizedText).toBe('copo');
  });

  it('rejeita duplicata normalizada na mesma charada', async () => {
    const repo = new FakeAcceptedAnswerRepository();
    await addAcceptedAnswer(repo, { riddleId: 'riddle-1', text: 'Copo' });
    await expect(
      addAcceptedAnswer(repo, { riddleId: 'riddle-1', text: '  copo ' }),
    ).rejects.toBeInstanceOf(DuplicateAcceptedAnswerError);
  });

  it('permite a mesma resposta normalizada em charadas diferentes', async () => {
    const repo = new FakeAcceptedAnswerRepository();
    await addAcceptedAnswer(repo, { riddleId: 'riddle-1', text: 'copo' });
    await expect(
      addAcceptedAnswer(repo, { riddleId: 'riddle-2', text: 'copo' }),
    ).resolves.toBeTruthy();
  });

  it('rejeita resposta vazia', async () => {
    const repo = new FakeAcceptedAnswerRepository();
    await expect(
      addAcceptedAnswer(repo, { riddleId: 'riddle-1', text: '   ' }),
    ).rejects.toBeInstanceOf(InvalidAcceptedAnswerError);
  });
});

describe('listAnswers', () => {
  it('lista as respostas de uma charada', async () => {
    const repo = new FakeAcceptedAnswerRepository();
    await addAcceptedAnswer(repo, { riddleId: 'riddle-1', text: 'copo' });
    await addAcceptedAnswer(repo, { riddleId: 'riddle-1', text: 'um copo' });
    const answers = await listAnswers(repo, 'riddle-1');
    expect(answers).toHaveLength(2);
  });
});
