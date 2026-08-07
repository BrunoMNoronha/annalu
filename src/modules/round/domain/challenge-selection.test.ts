import { describe, expect, it } from 'vitest';
import type { ActiveContent } from '@/modules/content';
import {
  collectEligibleRiddles,
  selectChallenges,
  type EligibleRiddle,
} from '@/modules/round/domain/challenge-selection';
import { sequenceRandom } from '@/shared/random/random-source';

function activeRiddle(
  id: string,
  answers: number,
): ActiveContent['riddles'][number] {
  return {
    riddle: { id, wordId: 'word-1', prompt: `p-${id}`, status: 'ACTIVE' },
    acceptedAnswers: Array.from({ length: answers }, (_, i) => ({
      id: `${id}-a${i}`,
      riddleId: id,
      text: `t${i}`,
      normalizedText: `t${i}`,
    })),
  };
}

function pool(ids: readonly string[]): EligibleRiddle[] {
  return ids.map((riddleId) => ({ riddleId, wordId: 'word-1' }));
}

describe('collectEligibleRiddles', () => {
  it('inclui apenas charadas ativas com ao menos uma resposta aceita', () => {
    const active: ActiveContent[] = [
      {
        word: {
          id: 'word-1',
          text: 'copo',
          status: 'ACTIVE',
          createdByAdminUserId: 'admin-1',
        },
        riddles: [
          activeRiddle('r-com-resposta', 1),
          activeRiddle('r-sem-resposta', 0),
        ],
      },
    ];
    const eligible = collectEligibleRiddles(active);
    expect(eligible.map((r) => r.riddleId)).toEqual(['r-com-resposta']);
  });
});

describe('selectChallenges', () => {
  it('é determinística com fonte de aleatoriedade controlada', () => {
    // Fisher–Yates com next()=0 sempre desloca a cabeça; slice(0,2) => [r2,r3].
    const selected = selectChallenges(
      pool(['r1', 'r2', 'r3', 'r4']),
      2,
      sequenceRandom([0]),
    );
    expect(selected).toEqual([
      { riddleId: 'r2', position: 1 },
      { riddleId: 'r3', position: 2 },
    ]);
  });

  it('não repete charadas dentro da rodada (seleção sem reposição)', () => {
    const selected = selectChallenges(
      pool(['r1', 'r2', 'r3', 'r4', 'r5']),
      4,
      sequenceRandom([0.1, 0.9, 0.5, 0.3, 0.7]),
    );
    const ids = selected.map((c) => c.riddleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('atribui posições 1..N contíguas e determinísticas', () => {
    const selected = selectChallenges(
      pool(['r1', 'r2', 'r3']),
      3,
      sequenceRandom([0.42, 0.7, 0.1]),
    );
    expect(selected.map((c) => c.position)).toEqual([1, 2, 3]);
  });

  it('pool exatamente igual à quantidade requerida seleciona todo o pool', () => {
    const selected = selectChallenges(
      pool(['r1', 'r2', 'r3']),
      3,
      sequenceRandom([0.2, 0.8, 0.4]),
    );
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((c) => c.riddleId))).toEqual(
      new Set(['r1', 'r2', 'r3']),
    );
  });

  it('pool maior que a quantidade requerida seleciona um subconjunto do pool', () => {
    const source = ['r1', 'r2', 'r3', 'r4', 'r5'];
    const selected = selectChallenges(
      pool(source),
      2,
      sequenceRandom([0.3, 0.6, 0.9, 0.1, 0.5]),
    );
    expect(selected).toHaveLength(2);
    for (const c of selected) {
      expect(source).toContain(c.riddleId);
    }
  });

  it('não muta o pool de entrada', () => {
    const input = pool(['r1', 'r2', 'r3']);
    const snapshot = input.map((r) => r.riddleId);
    selectChallenges(input, 2, sequenceRandom([0.5, 0.5]));
    expect(input.map((r) => r.riddleId)).toEqual(snapshot);
  });
});
