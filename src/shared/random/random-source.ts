/**
 * Abstração de fonte de aleatoriedade para permitir seleção determinística em
 * testes. A regra de negócio (seleção de desafios) depende apenas desta
 * interface — nunca chama `Math.random()` diretamente. A infraestrutura/
 * apresentação injeta uma implementação; os testes injetam uma sequência fixa.
 */
export interface RandomSource {
  /** Número pseudoaleatório em `[0, 1)`. */
  next(): number;
}

/** Fonte real baseada em `Math.random()` (único ponto que o toca). */
export const systemRandom: RandomSource = {
  next: () => Math.random(),
};

/**
 * Fonte determinística para testes: consome a sequência informada e a repete
 * ciclicamente. Cada valor deve estar em `[0, 1)`. Não usar em produção.
 */
export function sequenceRandom(values: readonly number[]): RandomSource {
  if (values.length === 0) {
    throw new Error('sequenceRandom requires at least one value.');
  }
  let index = 0;
  return {
    next: () => {
      const value = values[index % values.length]!;
      index += 1;
      return value;
    },
  };
}
