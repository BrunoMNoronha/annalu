import type {
  ContentCatalogRepository,
  GameConfigurationRepository,
} from '@/modules/content';
import { getCurrentConfiguration, listActiveContent } from '@/modules/content';
import type { GameSessionRepository } from '@/modules/round/application/ports';
import {
  collectEligibleRiddles,
  selectChallenges,
} from '@/modules/round/domain/challenge-selection';
import {
  InsufficientActiveContentError,
  NoCurrentConfigurationError,
} from '@/modules/round/domain/errors';
import type { GameSession } from '@/modules/round/domain/game-session';
import type { RandomSource } from '@/shared/random/random-source';

/** Dependências (ports + fonte de aleatoriedade) injetadas em `createRound`. */
export interface CreateRoundDependencies {
  readonly configurations: GameConfigurationRepository;
  readonly catalog: ContentCatalogRepository;
  readonly sessions: GameSessionRepository;
  readonly random: RandomSource;
}

/**
 * Cria/prepara uma rodada para um jogador identificado (`playerId`):
 *
 * 1. lê a **configuração vigente** (erro se não houver — sem defaults);
 * 2. lê o **acervo ativo** e coleta as charadas **elegíveis**;
 * 3. valida o acervo (erro provisório se insuficiente — RN-SEL-003 HIPÓTESE),
 *    **antes** de qualquer persistência;
 * 4. **sorteia** a quantidade configurada (sem reposição, aleatoriedade
 *    injetável);
 * 5. persiste `GameSession` + `SessionChallenge` de forma **atômica**,
 *    preservando os snapshots obrigatórios e o `configurationId` de origem.
 *
 * A rodada nasce em `CREATED`; o início é responsabilidade de `startRound`.
 */
export async function createRound(
  deps: CreateRoundDependencies,
  input: { playerId: string },
): Promise<GameSession> {
  const configuration = await getCurrentConfiguration(deps.configurations);
  if (!configuration) {
    throw new NoCurrentConfigurationError();
  }

  const active = await listActiveContent(deps.catalog);
  const pool = collectEligibleRiddles(active);
  const required = configuration.challengesPerRound;
  if (pool.length < required) {
    throw new InsufficientActiveContentError(pool.length, required);
  }

  const challenges = selectChallenges(pool, required, deps.random);

  return deps.sessions.create({
    playerId: input.playerId,
    configurationId: configuration.id,
    // Snapshots obrigatórios (RN-ROD-004): copiados da configuração vigente.
    pointsPerApprovalSnapshot: configuration.pointsPerApproval,
    uploadGraceSecondsSnapshot: configuration.uploadGraceSeconds,
    challengesCountSnapshot: configuration.challengesPerRound,
    timeLimitSecondsSnapshot: configuration.timeLimitSeconds,
    challenges,
  });
}
