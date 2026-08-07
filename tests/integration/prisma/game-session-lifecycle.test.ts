import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createRound,
  expireRoundIfDue,
  startRound,
  GameSessionNotFoundError,
  InvalidGameSessionStateTransitionError,
} from '@/modules/round';
import {
  PrismaContentCatalogRepository,
  PrismaGameConfigurationRepository,
} from '@/infrastructure/prisma/content';
import { PrismaGameSessionRepository } from '@/infrastructure/prisma/round';
import { fixedClock, systemClock } from '@/shared/clock/clock';
import { systemRandom } from '@/shared/random/random-source';
import { createTestPrisma, resetDatabase } from './helpers';

/**
 * Integração do ciclo de vida da rodada — **início concorrente-seguro** e
 * **expiração** (`IN_PROGRESS → EXPIRED`) com PostgreSQL real e descartável.
 * Apenas dados FICTÍCIOS.
 */
let prisma: PrismaClient;
let sessions: PrismaGameSessionRepository;
let catalog: PrismaContentCatalogRepository;
let configs: PrismaGameConfigurationRepository;

beforeAll(() => {
  prisma = createTestPrisma();
  sessions = new PrismaGameSessionRepository(prisma);
  catalog = new PrismaContentCatalogRepository(prisma);
  configs = new PrismaGameConfigurationRepository(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetDatabase(prisma);
});

async function anAdmin(): Promise<string> {
  const admin = await prisma.adminUser.create({ data: {} });
  return admin.id;
}
async function aPlayer(): Promise<string> {
  const player = await prisma.player.create({
    data: { nickname: 'Jogador Teste', accessCodeHash: 'hash-ficticio' },
  });
  return player.id;
}
async function eligibleRiddles(adminId: string, count: number): Promise<void> {
  const word = await prisma.word.create({
    data: { text: 'copo', createdByAdminUserId: adminId, status: 'ACTIVE' },
  });
  for (let i = 0; i < count; i += 1) {
    const riddle = await prisma.riddle.create({
      data: { wordId: word.id, prompt: `charada ${i}`, status: 'ACTIVE' },
    });
    await prisma.acceptedAnswer.create({
      data: { riddleId: riddle.id, text: 'copo', normalizedText: 'copo' },
    });
  }
}

function deps() {
  return { configurations: configs, catalog, sessions, random: systemRandom };
}

/** Cria uma rodada (estado `CREATED`) pronta para iniciar. */
async function createdSession(timeLimitSeconds = 600): Promise<string> {
  const admin = await anAdmin();
  await prisma.gameConfiguration.create({
    data: {
      pointsPerApproval: 10,
      uploadGraceSeconds: 60,
      challengesPerRound: 2,
      timeLimitSeconds,
      isCurrent: true,
    },
  });
  await eligibleRiddles(admin, 3);
  const playerId = await aPlayer();
  const session = await createRound(deps(), { playerId });
  return session.id;
}

/** Cria e inicia uma rodada; devolve o id e o `expiresAt` persistido. */
async function startedSession(): Promise<{ id: string; expiresAt: Date }> {
  const id = await createdSession(600);
  await startRound({ sessions, clock: systemClock }, { sessionId: id });
  const row = await prisma.gameSession.findUnique({ where: { id } });
  return { id, expiresAt: row!.expiresAt! };
}

describe('início concorrente-seguro (startRound)', () => {
  it('1. início normal transiciona CREATED → IN_PROGRESS', async () => {
    const id = await createdSession();
    const started = await startRound(
      { sessions, clock: systemClock },
      { sessionId: id },
    );
    expect(started.status).toBe('IN_PROGRESS');
    expect(started.startedAt).not.toBeNull();
    expect(started.expiresAt).not.toBeNull();
  });

  it('2/3/4/5. duas chamadas concorrentes: só uma vence e não sobrescreve timestamps', async () => {
    const id = await createdSession();

    const results = await Promise.allSettled([
      startRound({ sessions, clock: systemClock }, { sessionId: id }),
      startRound({ sessions, clock: systemClock }, { sessionId: id }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      InvalidGameSessionStateTransitionError,
    );

    const winner = (
      fulfilled[0] as PromiseFulfilledResult<{
        startedAt: Date | null;
        expiresAt: Date | null;
      }>
    ).value;
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('IN_PROGRESS');
    // Persistido == timestamps da vencedora (a perdedora não sobrescreveu).
    expect(row?.startedAt?.getTime()).toBe(winner.startedAt?.getTime());
    expect(row?.expiresAt?.getTime()).toBe(winner.expiresAt?.getTime());
  });

  it('6. nova tentativa depois do início recebe erro de transição', async () => {
    const { id } = await startedSession();
    await expect(
      startRound({ sessions, clock: systemClock }, { sessionId: id }),
    ).rejects.toBeInstanceOf(InvalidGameSessionStateTransitionError);
  });
});

describe('expiração (expireRoundIfDue)', () => {
  it('7. antes do prazo permanece IN_PROGRESS', async () => {
    const { id, expiresAt } = await startedSession();
    const result = await expireRoundIfDue(
      { sessions, clock: fixedClock(new Date(expiresAt.getTime() - 1000)) },
      { sessionId: id },
    );
    expect(result.expiredNow).toBe(false);
    expect(result.session.status).toBe('IN_PROGRESS');
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('IN_PROGRESS');
    expect(row?.endedAt).toBeNull();
  });

  it('8. exatamente no prazo passa a EXPIRED', async () => {
    const { id, expiresAt } = await startedSession();
    const result = await expireRoundIfDue(
      { sessions, clock: fixedClock(new Date(expiresAt.getTime())) },
      { sessionId: id },
    );
    expect(result.expiredNow).toBe(true);
    expect(result.session.status).toBe('EXPIRED');
  });

  it('9/10. depois do prazo passa a EXPIRED com endedAt = expiresAt', async () => {
    const { id, expiresAt } = await startedSession();
    const detectedAt = new Date(expiresAt.getTime() + 8000);
    const result = await expireRoundIfDue(
      { sessions, clock: fixedClock(detectedAt) },
      { sessionId: id },
    );
    expect(result.expiredNow).toBe(true);
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('EXPIRED');
    expect(row?.endedAt?.getTime()).toBe(expiresAt.getTime());
    // NUNCA o relógio de detecção.
    expect(row?.endedAt?.getTime()).not.toBe(detectedAt.getTime());
  });

  it('11. repetição da expiração é idempotente', async () => {
    const { id, expiresAt } = await startedSession();
    const clock = fixedClock(new Date(expiresAt.getTime() + 5000));
    const first = await expireRoundIfDue(
      { sessions, clock },
      { sessionId: id },
    );
    const second = await expireRoundIfDue(
      { sessions, clock: fixedClock(new Date(expiresAt.getTime() + 60000)) },
      { sessionId: id },
    );
    expect(first.expiredNow).toBe(true);
    expect(second.expiredNow).toBe(false);
    expect(second.session.status).toBe('EXPIRED');
    expect(second.session.endedAt?.getTime()).toBe(expiresAt.getTime());
  });

  it('12/13. duas chamadas concorrentes de expiração: estado final consistente', async () => {
    const { id, expiresAt } = await startedSession();
    const clock = fixedClock(new Date(expiresAt.getTime() + 3000));

    const results = await Promise.all([
      expireRoundIfDue({ sessions, clock }, { sessionId: id }),
      expireRoundIfDue({ sessions, clock }, { sessionId: id }),
    ]);

    const winners = results.filter((r) => r.expiredNow);
    expect(winners).toHaveLength(1);
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('EXPIRED');
    expect(row?.endedAt?.getTime()).toBe(expiresAt.getTime());
  });

  it('14. CREATED não expira', async () => {
    const id = await createdSession();
    const result = await expireRoundIfDue(
      { sessions, clock: fixedClock(new Date('2999-01-01T00:00:00.000Z')) },
      { sessionId: id },
    );
    expect(result.expiredNow).toBe(false);
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('CREATED');
    expect(row?.endedAt).toBeNull();
  });

  it('15. estado terminal (COMPLETED) não é modificado', async () => {
    const { id } = await startedSession();
    await prisma.gameSession.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    const result = await expireRoundIfDue(
      { sessions, clock: fixedClock(new Date('2999-01-01T00:00:00.000Z')) },
      { sessionId: id },
    );
    expect(result.expiredNow).toBe(false);
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('COMPLETED');
    expect(row?.endedAt).toBeNull();
  });

  it('16. sessão inexistente lança GameSessionNotFoundError', async () => {
    await expect(
      expireRoundIfDue(
        { sessions, clock: systemClock },
        { sessionId: '00000000-0000-4000-8000-0000000000dd' },
      ),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
  });
});
