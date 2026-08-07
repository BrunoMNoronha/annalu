import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createRound,
  startRound,
  GameSessionNotFoundError,
  InsufficientActiveContentError,
  NoCurrentConfigurationError,
  PlayerNotFoundError,
} from '@/modules/round';
import {
  PrismaContentCatalogRepository,
  PrismaGameConfigurationRepository,
} from '@/infrastructure/prisma/content';
import { PrismaGameSessionRepository } from '@/infrastructure/prisma/round';
import { systemClock } from '@/shared/clock/clock';
import { systemRandom } from '@/shared/random/random-source';
import { createTestPrisma, resetDatabase } from './helpers';

/**
 * Integração da rodada (`GameSession`/`SessionChallenge`) com PostgreSQL real e
 * descartável. Usa os adapters Prisma reais e apenas dados FICTÍCIOS.
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

async function aConfiguration(
  overrides: {
    challengesPerRound?: number;
    timeLimitSeconds?: number;
    pointsPerApproval?: number;
    uploadGraceSeconds?: number;
    isCurrent?: boolean;
  } = {},
): Promise<string> {
  const config = await prisma.gameConfiguration.create({
    data: {
      pointsPerApproval: overrides.pointsPerApproval ?? 10,
      uploadGraceSeconds: overrides.uploadGraceSeconds ?? 60,
      challengesPerRound: overrides.challengesPerRound ?? 3,
      timeLimitSeconds: overrides.timeLimitSeconds ?? 600,
      isCurrent: overrides.isCurrent ?? true,
    },
  });
  return config.id;
}

/** Cria uma palavra ativa com N charadas elegíveis (cada uma com 1 resposta). */
async function eligibleRiddles(
  adminId: string,
  count: number,
): Promise<string[]> {
  const word = await prisma.word.create({
    data: { text: 'copo', createdByAdminUserId: adminId, status: 'ACTIVE' },
  });
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const riddle = await prisma.riddle.create({
      data: { wordId: word.id, prompt: `charada ${i}`, status: 'ACTIVE' },
    });
    await prisma.acceptedAnswer.create({
      data: { riddleId: riddle.id, text: 'copo', normalizedText: 'copo' },
    });
    ids.push(riddle.id);
  }
  return ids;
}

function deps(random = systemRandom) {
  return { configurations: configs, catalog, sessions, random };
}

describe('rodada — criação (createRound)', () => {
  it('1/5/6. cria GameSession real com os SessionChallenge configurados', async () => {
    const admin = await anAdmin();
    await aConfiguration({ challengesPerRound: 3 });
    await eligibleRiddles(admin, 5);
    const playerId = await aPlayer();

    const session = await createRound(deps(), { playerId });
    expect(session.status).toBe('CREATED');
    expect(session.challenges).toHaveLength(3);

    const persisted = await prisma.sessionChallenge.count({
      where: { sessionId: session.id },
    });
    expect(persisted).toBe(3);
  });

  it('2/3. referencia o Player e a configuração corretos', async () => {
    const admin = await anAdmin();
    const configId = await aConfiguration({ challengesPerRound: 2 });
    await eligibleRiddles(admin, 4);
    const playerId = await aPlayer();

    const session = await createRound(deps(), { playerId });
    const row = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    expect(row?.playerId).toBe(playerId);
    expect(row?.configurationId).toBe(configId);
  });

  it('4. persiste exatamente os snapshots da configuração vigente', async () => {
    const admin = await anAdmin();
    await aConfiguration({
      challengesPerRound: 2,
      timeLimitSeconds: 300,
      pointsPerApproval: 15,
      uploadGraceSeconds: 45,
    });
    await eligibleRiddles(admin, 3);
    const playerId = await aPlayer();

    const session = await createRound(deps(), { playerId });
    const row = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    expect(row).toMatchObject({
      pointsPerApprovalSnapshot: 15,
      uploadGraceSecondsSnapshot: 45,
      challengesCountSnapshot: 2,
      timeLimitSecondsSnapshot: 300,
    });
  });

  it('7/8. posições e riddleId são únicos dentro da sessão', async () => {
    const admin = await anAdmin();
    await aConfiguration({ challengesPerRound: 4 });
    await eligibleRiddles(admin, 6);
    const playerId = await aPlayer();

    const session = await createRound(deps(), { playerId });
    const rows = await prisma.sessionChallenge.findMany({
      where: { sessionId: session.id },
    });
    const positions = rows.map((r) => r.position);
    const riddleIds = rows.map((r) => r.riddleId);
    expect(new Set(positions).size).toBe(positions.length);
    expect([...positions].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    expect(new Set(riddleIds).size).toBe(riddleIds.length);
  });

  it('9. seleciona apenas conteúdo ativo/elegível (ignora inativa e sem resposta)', async () => {
    const admin = await anAdmin();
    await aConfiguration({ challengesPerRound: 3 });
    const eligible = await eligibleRiddles(admin, 3);

    // Ruído: charada ativa SEM resposta aceita + charada INATIVA com resposta.
    const word = await prisma.word.create({
      data: { text: 'vaso', createdByAdminUserId: admin, status: 'ACTIVE' },
    });
    const noAnswer = await prisma.riddle.create({
      data: { wordId: word.id, prompt: 'sem resposta', status: 'ACTIVE' },
    });
    const inactive = await prisma.riddle.create({
      data: { wordId: word.id, prompt: 'inativa', status: 'INACTIVE' },
    });
    await prisma.acceptedAnswer.create({
      data: { riddleId: inactive.id, text: 'vaso', normalizedText: 'vaso' },
    });
    const playerId = await aPlayer();

    const session = await createRound(deps(), { playerId });
    const selected = session.challenges.map((c) => c.riddleId);
    expect(new Set(selected)).toEqual(new Set(eligible));
    expect(selected).not.toContain(noAnswer.id);
    expect(selected).not.toContain(inactive.id);
  });

  it('12. acervo insuficiente lança erro e não persiste rodada parcial', async () => {
    const admin = await anAdmin();
    await aConfiguration({ challengesPerRound: 5 });
    await eligibleRiddles(admin, 2);
    const playerId = await aPlayer();

    await expect(createRound(deps(), { playerId })).rejects.toBeInstanceOf(
      InsufficientActiveContentError,
    );
    expect(await prisma.gameSession.count()).toBe(0);
    expect(await prisma.sessionChallenge.count()).toBe(0);
  });

  it('13. sem configuração vigente lança erro e não persiste', async () => {
    const admin = await anAdmin();
    await aConfiguration({ challengesPerRound: 2, isCurrent: false });
    await eligibleRiddles(admin, 4);
    const playerId = await aPlayer();

    await expect(createRound(deps(), { playerId })).rejects.toBeInstanceOf(
      NoCurrentConfigurationError,
    );
    expect(await prisma.gameSession.count()).toBe(0);
  });

  it('14. jogador inexistente lança PlayerNotFoundError e não persiste', async () => {
    const admin = await anAdmin();
    await aConfiguration({ challengesPerRound: 2 });
    await eligibleRiddles(admin, 3);

    await expect(
      createRound(deps(), {
        playerId: '00000000-0000-4000-8000-0000000000aa',
      }),
    ).rejects.toBeInstanceOf(PlayerNotFoundError);
    expect(await prisma.gameSession.count()).toBe(0);
    expect(await prisma.sessionChallenge.count()).toBe(0);
  });

  it('15. falha ao criar um desafio faz rollback de toda a rodada (atomicidade)', async () => {
    const playerId = await aPlayer();
    const configId = await aConfiguration({ challengesPerRound: 2 });
    const admin = await anAdmin();
    const [validRiddle] = await eligibleRiddles(admin, 1);

    // Um desafio válido + um com riddleId inexistente: a escrita aninhada é
    // atômica, então NADA deve persistir.
    await expect(
      sessions.create({
        playerId,
        configurationId: configId,
        pointsPerApprovalSnapshot: 10,
        uploadGraceSecondsSnapshot: 60,
        challengesCountSnapshot: 2,
        timeLimitSecondsSnapshot: 600,
        challenges: [
          { riddleId: validRiddle!, position: 1 },
          { riddleId: '00000000-0000-4000-8000-0000000000bb', position: 2 },
        ],
      }),
    ).rejects.toBeTruthy();
    expect(await prisma.gameSession.count()).toBe(0);
    expect(await prisma.sessionChallenge.count()).toBe(0);
  });
});

describe('rodada — início (startRound)', () => {
  async function createdSession(): Promise<string> {
    const admin = await anAdmin();
    await aConfiguration({ challengesPerRound: 2, timeLimitSeconds: 600 });
    await eligibleRiddles(admin, 3);
    const playerId = await aPlayer();
    const session = await createRound(deps(), { playerId });
    return session.id;
  }

  it('10/11. inicia com startedAt do servidor e persiste expiresAt calculado', async () => {
    const sessionId = await createdSession();

    const started = await startRound(
      { sessions, clock: systemClock },
      { sessionId },
    );
    expect(started.status).toBe('IN_PROGRESS');
    expect(started.startedAt).not.toBeNull();

    const row = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    expect(row?.startedAt).not.toBeNull();
    expect(row?.expiresAt).not.toBeNull();
    // expiresAt = startedAt + timeLimitSecondsSnapshot (600 s).
    const startedAtMs = row!.startedAt!.getTime();
    const expiresAtMs = row!.expiresAt!.getTime();
    expect(expiresAtMs - startedAtMs).toBe(600 * 1000);
  });

  it('rodada inexistente lança GameSessionNotFoundError', async () => {
    await expect(
      startRound(
        { sessions, clock: systemClock },
        { sessionId: '00000000-0000-4000-8000-0000000000cc' },
      ),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
  });
});
