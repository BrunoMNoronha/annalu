import type { ActiveContent } from '@/modules/content';
import type { RandomSource } from '@/shared/random/random-source';

/**
 * Charada elegível para o sorteio: charada ativa (de palavra ativa) que possui
 * **ao menos uma resposta aceita** — sem resposta aceita a participação nunca
 * poderia ser considerada correta (RN-CHA-003). O `catalog` já filtra
 * palavra/charada ativas; a elegibilidade adiciona o requisito de resposta.
 */
export interface EligibleRiddle {
  readonly riddleId: string;
  readonly wordId: string;
}

/**
 * Desafio selecionado para a rodada: a charada e sua posição 1..N. Estrutura
 * pura (sem ids persistidos) consumida pelo `GameSessionRepository`.
 */
export interface SelectedChallenge {
  readonly riddleId: string;
  readonly position: number;
}

/**
 * Achata o acervo ativo em charadas elegíveis (com resposta aceita), preservando
 * a ordem de leitura. Função pura.
 */
export function collectEligibleRiddles(
  active: readonly ActiveContent[],
): EligibleRiddle[] {
  const eligible: EligibleRiddle[] = [];
  for (const content of active) {
    for (const activeRiddle of content.riddles) {
      if (activeRiddle.acceptedAnswers.length > 0) {
        eligible.push({
          riddleId: activeRiddle.riddle.id,
          wordId: content.word.id,
        });
      }
    }
  }
  return eligible;
}

/**
 * Embaralhamento de Fisher–Yates determinístico dado `random`. Função pura: não
 * muta a entrada. A aleatoriedade vem apenas de `random.next()`.
 */
function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

/**
 * Seleção **sem reposição** de `count` desafios a partir do pool elegível,
 * atribuindo posições 1..N na ordem sorteada. Como o pool não tem repetições e a
 * seleção é sem reposição, não há charadas repetidas na rodada — consistente com
 * a unicidade física `(sessionId, riddleId)`. Ver docs/12: **RN-SEL-002**
 * permanece HIPÓTESE (esta implementação não a promove a CONFIRMADO).
 *
 * Espera `count <= pool.length` (garantido por `createRound`); defensivamente,
 * seleciona no máximo `pool.length`.
 */
export function selectChallenges(
  pool: readonly EligibleRiddle[],
  count: number,
  random: RandomSource,
): SelectedChallenge[] {
  return shuffle(pool, random)
    .slice(0, Math.max(0, count))
    .map((riddle, index) => ({
      riddleId: riddle.riddleId,
      position: index + 1,
    }));
}
