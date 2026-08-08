import { expireRoundAt } from '@/modules/round/application/expire-round';
import type { GameSessionRepository } from '@/modules/round/application/ports';
import type {
  RoundStateChallengeView,
  RoundStateQueryRepository,
} from '@/modules/round/application/round-state-ports';
import { GameSessionNotFoundError } from '@/modules/round/domain/errors';
import type { GameSessionStatus } from '@/modules/round/domain/game-session';
import { remainingMilliseconds } from '@/modules/round/domain/game-session';
import type { Clock } from '@/shared/clock/clock';

/**
 * Estado atual da rodada para consumo futuro pelo jogador (endpoint/tela/
 * contador/reload). **Não** expõe palavra-alvo, respostas aceitas, PII do
 * jogador/responsável, credenciais nem `configurationId` — apenas o necessário
 * para a experiência da rodada.
 */
export interface RoundState {
  readonly sessionId: string;
  readonly status: GameSessionStatus;
  readonly startedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly endedAt: Date | null;
  /** Instante autoritativo (servidor) usado nesta consulta. */
  readonly serverNow: Date;
  /** Tempo restante em ms (precisão; sem arredondamento de apresentação). */
  readonly remainingMilliseconds: number | null;
  readonly totalChallenges: number;
  readonly challenges: readonly RoundStateChallengeView[];
}

/** Dependências injetadas em `getRoundState`. */
export interface GetRoundStateDependencies {
  /** Agregado de escrita — usado só para a expiração sob demanda. */
  readonly sessions: GameSessionRepository;
  /** Read model (projeção mínima) da rodada. */
  readonly roundStates: RoundStateQueryRepository;
  readonly clock: Clock;
}

/**
 * Consulta o estado atual de uma rodada (somente leitura, exceto a expiração
 * temporal já autorizada). Passos:
 *
 * 1. captura um **único** `serverNow` autoritativo (`Clock`);
 * 2. aplica a **expiração sob demanda** com esse mesmo `now` (reutiliza a regra
 *    concorrente-segura `expireRoundAt` — não a duplica), de modo que uma rodada
 *    vencida nunca seja observada como `IN_PROGRESS`;
 * 3. lê a **projeção mínima** persistida (sessão + desafios com `prompt`,
 *    ordenados por `position`), sem reexecutar sorteio nem filtrar pelo status
 *    atual do catálogo;
 * 4. calcula `remainingMilliseconds` com o **mesmo** `serverNow`.
 *
 * Sessão inexistente → `GameSessionNotFoundError`. A consulta não inicia,
 * completa, cancela nem altera `SessionChallenge`.
 *
 * Autorização: fora do escopo desta camada. O futuro route handler DEVE resolver
 * o jogador autenticado e verificar seu acesso à sessão antes de expor esta
 * projeção.
 */
export async function getRoundState(
  deps: GetRoundStateDependencies,
  input: { sessionId: string },
): Promise<RoundState> {
  // Uma única referência temporal por consulta: orienta expiração, serverNow e
  // o cálculo do tempo restante.
  const serverNow = deps.clock.now();

  // Expiração sob demanda ANTES do estado observável.
  await expireRoundAt(deps.sessions, {
    sessionId: input.sessionId,
    now: serverNow,
  });

  const projection = await deps.roundStates.loadRoundState(input.sessionId);
  if (!projection) {
    throw new GameSessionNotFoundError(input.sessionId);
  }

  return {
    sessionId: projection.sessionId,
    status: projection.status,
    startedAt: projection.startedAt,
    expiresAt: projection.expiresAt,
    endedAt: projection.endedAt,
    serverNow,
    remainingMilliseconds: remainingMilliseconds(
      projection.status,
      projection.expiresAt,
      serverNow,
    ),
    totalChallenges: projection.challenges.length,
    challenges: projection.challenges,
  };
}
