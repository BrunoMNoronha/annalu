/**
 * Ponto de entrada público do módulo "round" (criação e início de rodada +
 * seleção de desafios). Consumidores externos importam daqui, não dos arquivos
 * internos.
 *
 * Esta fatia é apenas domínio + aplicação + ports; o adapter de infraestrutura
 * (Prisma) fica em `src/infrastructure/prisma/round`. A leitura de configuração
 * vigente e do acervo ativo reutiliza o módulo `content`. Sem HTTP/UI/auth.
 */

// Serviços de aplicação (casos de uso)
export {
  createRound,
  type CreateRoundDependencies,
} from '@/modules/round/application/create-round';
export {
  startRound,
  type StartRoundDependencies,
} from '@/modules/round/application/start-round';

// Ports (para adapters e testes)
export type {
  GameSessionRepository,
  CreateGameSessionInput,
  StartGameSessionInput,
} from '@/modules/round/application/ports';

// Domínio — rodada
export type {
  GameSession,
  GameSessionStatus,
  SessionChallenge,
} from '@/modules/round/domain/game-session';
export {
  assertCanStart,
  computeExpiresAt,
} from '@/modules/round/domain/game-session';
export type { SessionChallengeState } from '@/modules/round/domain/session-challenge-state';

// Domínio — seleção de desafios (funções puras)
export type {
  EligibleRiddle,
  SelectedChallenge,
} from '@/modules/round/domain/challenge-selection';
export {
  collectEligibleRiddles,
  selectChallenges,
} from '@/modules/round/domain/challenge-selection';

// Erros
export {
  RoundError,
  NoCurrentConfigurationError,
  InsufficientActiveContentError,
  PlayerNotFoundError,
  GameSessionNotFoundError,
  InvalidGameSessionStateTransitionError,
} from '@/modules/round/domain/errors';
