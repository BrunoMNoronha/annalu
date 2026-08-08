import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  CreateGameSessionInput,
  ExpireGameSessionInput,
  GameSession,
  GameSessionRepository,
  GameSessionStatus,
  SessionChallengeState,
  StartGameSessionInput,
} from '@/modules/round';
import { PlayerNotFoundError } from '@/modules/round';
import { expireDueSql } from '@/infrastructure/prisma/round/expire-due';

interface SessionChallengeRow {
  id: string;
  riddleId: string;
  position: number;
  state: SessionChallengeState;
}

interface GameSessionRow {
  id: string;
  playerId: string;
  configurationId: string;
  status: GameSessionStatus;
  pointsPerApprovalSnapshot: number;
  uploadGraceSecondsSnapshot: number;
  challengesCountSnapshot: number;
  timeLimitSecondsSnapshot: number;
  startedAt: Date | null;
  expiresAt: Date | null;
  endedAt: Date | null;
  sessionChallenges: SessionChallengeRow[];
}

function toSession(row: GameSessionRow): GameSession {
  return {
    id: row.id,
    playerId: row.playerId,
    configurationId: row.configurationId,
    status: row.status,
    pointsPerApprovalSnapshot: row.pointsPerApprovalSnapshot,
    uploadGraceSecondsSnapshot: row.uploadGraceSecondsSnapshot,
    challengesCountSnapshot: row.challengesCountSnapshot,
    timeLimitSecondsSnapshot: row.timeLimitSecondsSnapshot,
    startedAt: row.startedAt,
    expiresAt: row.expiresAt,
    endedAt: row.endedAt,
    challenges: row.sessionChallenges.map((challenge) => ({
      id: challenge.id,
      riddleId: challenge.riddleId,
      position: challenge.position,
      state: challenge.state,
    })),
  };
}

/** Indica se a violação de FK (P2003) diz respeito ao jogador. */
function referencesPlayer(
  error: Prisma.PrismaClientKnownRequestError,
): boolean {
  const meta = (error.meta ?? {}) as Record<string, unknown>;
  return [meta['field_name'], meta['constraint'], meta['modelName']]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
    .includes('player');
}

/**
 * Adapter Prisma do `GameSessionRepository`. A criação usa **escrita aninhada**
 * (`gameSession.create` com `sessionChallenges.create`), executada em uma única
 * transação (atomicidade tudo-ou-nada). As transições de estado são
 * **compare-and-set atômicos** (`startIfCreated`/`expireIfDue`): a condição de
 * estado integra a cláusula `WHERE` da escrita, sem TOCTOU. Traduz violações do
 * banco para erros de domínio; nunca vaza mensagem/código do Prisma.
 */
export class PrismaGameSessionRepository implements GameSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateGameSessionInput): Promise<GameSession> {
    try {
      const row = await this.prisma.gameSession.create({
        data: {
          playerId: input.playerId,
          configurationId: input.configurationId,
          pointsPerApprovalSnapshot: input.pointsPerApprovalSnapshot,
          uploadGraceSecondsSnapshot: input.uploadGraceSecondsSnapshot,
          challengesCountSnapshot: input.challengesCountSnapshot,
          timeLimitSecondsSnapshot: input.timeLimitSecondsSnapshot,
          sessionChallenges: {
            create: input.challenges.map((challenge) => ({
              riddleId: challenge.riddleId,
              position: challenge.position,
            })),
          },
        },
        include: { sessionChallenges: { orderBy: { position: 'asc' } } },
      });
      return toSession(row);
    } catch (error) {
      // FK inexistente para o jogador → rodada sem jogador válido.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003' &&
        referencesPlayer(error)
      ) {
        throw new PlayerNotFoundError(input.playerId);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<GameSession | null> {
    const row = await this.prisma.gameSession.findUnique({
      where: { id },
      include: { sessionChallenges: { orderBy: { position: 'asc' } } },
    });
    return row ? toSession(row) : null;
  }

  async startIfCreated(
    input: StartGameSessionInput,
  ): Promise<GameSession | null> {
    // Compare-and-set: só transiciona se ainda estiver CREATED. `updateMany`
    // aplica a condição de estado na cláusula WHERE (atômico no banco).
    const result = await this.prisma.gameSession.updateMany({
      where: { id: input.sessionId, status: 'CREATED' },
      data: {
        status: 'IN_PROGRESS',
        startedAt: input.startedAt,
        expiresAt: input.expiresAt,
      },
    });
    if (result.count === 0) {
      return null;
    }
    return this.findById(input.sessionId);
  }

  async expireIfDue(
    input: ExpireGameSessionInput,
  ): Promise<GameSession | null> {
    // Compare-and-set atômico compartilhado (mesma regra usada na gravação de
    // rascunho): transiciona IN_PROGRESS → EXPIRED apenas se vencida, gravando
    // `ended_at = expires_at` (nunca o relógio de detecção).
    const affected = await expireDueSql(
      this.prisma,
      input.sessionId,
      input.now,
    );
    if (affected === 0) {
      return null;
    }
    return this.findById(input.sessionId);
  }
}
