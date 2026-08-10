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
export {
  expireRoundIfDue,
  expireRoundAt,
  type ExpireRoundDependencies,
  type ExpireRoundResult,
} from '@/modules/round/application/expire-round';
export {
  getRoundState,
  type RoundState,
  type GetRoundStateDependencies,
} from '@/modules/round/application/get-round-state';
export {
  saveAnswerDraft,
  type SaveAnswerDraftDependencies,
} from '@/modules/round/application/save-answer-draft';

// Ports (para adapters e testes)
export type {
  GameSessionRepository,
  CreateGameSessionInput,
  StartGameSessionInput,
  ExpireGameSessionInput,
} from '@/modules/round/application/ports';
export type {
  RoundStateQueryRepository,
  RoundStateProjection,
  RoundStateChallengeView,
  RoundStateAnswerView,
} from '@/modules/round/application/round-state-ports';
export type {
  PlayerAnswerDraftRepository,
  SaveAnswerDraftInput,
} from '@/modules/round/application/player-answer-ports';

// Domínio — rodada
export type {
  GameSession,
  GameSessionStatus,
  SessionChallenge,
} from '@/modules/round/domain/game-session';
export {
  assertCanStart,
  computeExpiresAt,
  isExpiredAt,
  remainingMilliseconds,
} from '@/modules/round/domain/game-session';
export type { SessionChallengeState } from '@/modules/round/domain/session-challenge-state';
export type { PlayerAnswer } from '@/modules/round/domain/player-answer';
export {
  classifyDraftEditability,
  assertPlayerAnswerDraft,
  type DraftEditability,
} from '@/modules/round/domain/player-answer';
export type { PlayerAnswerState } from '@/modules/round/domain/player-answer-state';

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
  GameSessionNotEditableError,
  SessionChallengeNotFoundError,
  SessionChallengeMismatchError,
  PlayerAnswerNotDraftError,
} from '@/modules/round/domain/errors';
