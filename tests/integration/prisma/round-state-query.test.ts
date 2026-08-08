import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createRound,
  getRoundState,
  startRound,
  GameSessionNotFoundError,
} from '@/modules/round';
import {
  PrismaContentCatalogRepository,
  PrismaGameConfigurationRepository,
} from '@/infrastructure/prisma/content';
import {
  PrismaGameSessionRepository,
  PrismaRoundStateQueryRepository,
} from '@/infrastructure/prisma/round';
import { fixedClock, systemClock } from '@/shared/clock/clock';
import { systemRandom } from '@/shared/random/random-source';
import { createTestPrisma, resetDatabase } from './helpers';

/**
 * Integração da consulta do estado da rodada (`getRoundState`) com PostgreSQL
 * real e descartável. Marcadores "secretos" nas fixtures provam a minimização de
 * dados (palavra-alvo/respostas aceitas NUNCA saem na projeção). Apenas dados
 * FICTÍCIOS.
 */
const SECRET_WORD = 'PALAVRA_SECRETA';
const SECRET_ANSWER = 'RESPOSTA_SECRETA';

let prisma: PrismaClient;
let sessions: PrismaGameSessionRepository;
let roundStates: PrismaRoundStateQueryRepository;
let catalog: PrismaContentCatalogRepository;
let configs: PrismaGameConfigurationRepository;

beforeAll(() => {
  prisma = createTestPrisma();
  sessions = new PrismaGameSessionRepository(prisma);
  roundStates = new PrismaRoundStateQueryRepository(prisma);
  catalog = new PrismaContentCatalogRepository(prisma);
  configs = new PrismaGameConfigurationRepository(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetDatabase(prisma);
});

function createDeps() {
  return { configurations: configs, catalog, sessions, random: systemRandom };
}

/** Cria palavra ativa (texto secreto) com N charadas elegíveis (resposta secreta). */
async function seedContent(count: number): Promise<void> {
  const admin = await prisma.adminUser.create({ data: {} });
  const word = await prisma.word.create({
    data: {
      text: SECRET_WORD,
      createdByAdminUserId: admin.id,
      status: 'ACTIVE',
    },
  });
  for (let i = 0; i < count; i += 1) {
    const riddle = await prisma.riddle.create({
      data: { wordId: word.id, prompt: `charada ${i + 1}`, status: 'ACTIVE' },
    });
    await prisma.acceptedAnswer.create({
      data: {
        riddleId: riddle.id,
        text: SECRET_ANSWER,
        normalizedText: SECRET_ANSWER.toLowerCase(),
      },
    });
  }
}

async function aConfiguration(timeLimitSeconds = 600): Promise<void> {
  await prisma.gameConfiguration.create({
    data: {
      pointsPerApproval: 10,
      uploadGraceSeconds: 60,
      challengesPerRound: 3,
      timeLimitSeconds,
      isCurrent: true,
    },
  });
}

async function aPlayer(): Promise<string> {
  const player = await prisma.player.create({
    data: { nickname: 'Jogador Teste', accessCodeHash: 'hash-ficticio' },
  });
  return player.id;
}

/** Rodada em `CREATED`. */
async function createdSession(): Promise<string> {
  await aConfiguration();
  await seedContent(5);
  const playerId = await aPlayer();
  const session = await createRound(createDeps(), { playerId });
  return session.id;
}

/** Rodada iniciada; devolve id + `expiresAt` persistido. */
async function startedSession(): Promise<{ id: string; expiresAt: Date }> {
  const id = await createdSession();
  await startRound({ sessions, clock: systemClock }, { sessionId: id });
  const row = await prisma.gameSession.findUnique({ where: { id } });
  return { id, expiresAt: row!.expiresAt! };
}

describe('getRoundState — carga e ordenação', () => {
  it('1/2/3/4. carrega sessão + desafios persistidos, ordenados, com prompt', async () => {
    const { id } = await startedSession();
    const state = await getRoundState(
      { sessions, roundStates, clock: systemClock },
      { sessionId: id },
    );
    expect(state.sessionId).toBe(id);
    expect(state.totalChallenges).toBe(3);
    expect(state.challenges).toHaveLength(3);
    expect(state.challenges.map((c) => c.position)).toEqual([1, 2, 3]);
    for (const challenge of state.challenges) {
      expect(challenge.prompt).toMatch(/^charada /);
    }
  });

  it('5/6. minimização: não expõe palavra-alvo nem respostas aceitas', async () => {
    const { id } = await startedSession();
    const state = await getRoundState(
      { sessions, roundStates, clock: systemClock },
      { sessionId: id },
    );
    const serialized = JSON.stringify(state);
    expect(serialized).not.toContain(SECRET_WORD);
    expect(serialized).not.toContain(SECRET_ANSWER);
    expect(serialized).not.toContain(SECRET_ANSWER.toLowerCase());
    // Sem PII/credenciais/ids desnecessários.
    expect(serialized).not.toContain('Jogador Teste');
    expect(serialized).not.toContain('hash-ficticio');
    expect(state).not.toHaveProperty('playerId');
    expect(state).not.toHaveProperty('configurationId');
    for (const challenge of state.challenges) {
      expect(Object.keys(challenge).sort()).toEqual([
        'challengeId',
        'position',
        'prompt',
        'state',
      ]);
    }
  });
});

describe('getRoundState — expiração sob demanda', () => {
  it('7/8. IN_PROGRESS não vencida permanece IN_PROGRESS com remaining correto', async () => {
    const { id, expiresAt } = await startedSession();
    const now = new Date(expiresAt.getTime() - 5000);
    const state = await getRoundState(
      { sessions, roundStates, clock: fixedClock(now) },
      { sessionId: id },
    );
    expect(state.status).toBe('IN_PROGRESS');
    expect(state.remainingMilliseconds).toBe(5000);
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('IN_PROGRESS');
    expect(row?.endedAt).toBeNull();
  });

  it('9/11. exatamente no prazo → EXPIRED e persiste endedAt = expiresAt', async () => {
    const { id, expiresAt } = await startedSession();
    const state = await getRoundState(
      {
        sessions,
        roundStates,
        clock: fixedClock(new Date(expiresAt.getTime())),
      },
      { sessionId: id },
    );
    expect(state.status).toBe('EXPIRED');
    expect(state.remainingMilliseconds).toBe(0);
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('EXPIRED');
    expect(row?.endedAt?.getTime()).toBe(expiresAt.getTime());
  });

  it('10. após o prazo → EXPIRED (endedAt nunca é o relógio de detecção)', async () => {
    const { id, expiresAt } = await startedSession();
    const detectedAt = new Date(expiresAt.getTime() + 8000);
    await getRoundState(
      { sessions, roundStates, clock: fixedClock(detectedAt) },
      { sessionId: id },
    );
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('EXPIRED');
    expect(row?.endedAt?.getTime()).toBe(expiresAt.getTime());
    expect(row?.endedAt?.getTime()).not.toBe(detectedAt.getTime());
  });

  it('12. consulta repetida após expiração é idempotente', async () => {
    const { id, expiresAt } = await startedSession();
    const first = await getRoundState(
      {
        sessions,
        roundStates,
        clock: fixedClock(new Date(expiresAt.getTime() + 3000)),
      },
      { sessionId: id },
    );
    const second = await getRoundState(
      {
        sessions,
        roundStates,
        clock: fixedClock(new Date(expiresAt.getTime() + 60000)),
      },
      { sessionId: id },
    );
    expect(first.status).toBe('EXPIRED');
    expect(second.status).toBe('EXPIRED');
    expect(second.endedAt?.getTime()).toBe(expiresAt.getTime());
  });

  it('13. consulta concorrente no instante vencido → estado final consistente', async () => {
    const { id, expiresAt } = await startedSession();
    const clock = fixedClock(new Date(expiresAt.getTime() + 2000));
    const [a, b] = await Promise.all([
      getRoundState({ sessions, roundStates, clock }, { sessionId: id }),
      getRoundState({ sessions, roundStates, clock }, { sessionId: id }),
    ]);
    expect(a.status).toBe('EXPIRED');
    expect(b.status).toBe('EXPIRED');
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('EXPIRED');
    expect(row?.endedAt?.getTime()).toBe(expiresAt.getTime());
  });
});

describe('getRoundState — estados não alterados pela consulta', () => {
  it('14. CREATED não é iniciada pela consulta', async () => {
    const id = await createdSession();
    const state = await getRoundState(
      {
        sessions,
        roundStates,
        clock: fixedClock(new Date('2999-01-01T00:00:00Z')),
      },
      { sessionId: id },
    );
    expect(state.status).toBe('CREATED');
    expect(state.remainingMilliseconds).toBeNull();
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('CREATED');
    expect(row?.startedAt).toBeNull();
  });

  it('15. COMPLETED não é alterada', async () => {
    const { id } = await startedSession();
    await prisma.gameSession.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    const state = await getRoundState(
      {
        sessions,
        roundStates,
        clock: fixedClock(new Date('2999-01-01T00:00:00Z')),
      },
      { sessionId: id },
    );
    expect(state.status).toBe('COMPLETED');
    expect(state.remainingMilliseconds).toBeNull();
    const row = await prisma.gameSession.findUnique({ where: { id } });
    expect(row?.status).toBe('COMPLETED');
  });

  it('16. CANCELLED não é alterada', async () => {
    const { id } = await startedSession();
    await prisma.gameSession.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    const state = await getRoundState(
      {
        sessions,
        roundStates,
        clock: fixedClock(new Date('2999-01-01T00:00:00Z')),
      },
      { sessionId: id },
    );
    expect(state.status).toBe('CANCELLED');
    expect(state.remainingMilliseconds).toBeNull();
  });

  it('17. sessão inexistente → GameSessionNotFoundError', async () => {
    await expect(
      getRoundState(
        { sessions, roundStates, clock: systemClock },
        { sessionId: '00000000-0000-4000-8000-0000000000ee' },
      ),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
  });
});

describe('getRoundState — conteúdo desativado após a criação', () => {
  it('18. desativar a Riddle não remove o desafio da rodada existente', async () => {
    const { id } = await startedSession();
    const before = await getRoundState(
      { sessions, roundStates, clock: systemClock },
      { sessionId: id },
    );
    // Desativa todas as charadas usadas na rodada.
    await prisma.riddle.updateMany({ data: { status: 'INACTIVE' } });
    const after = await getRoundState(
      { sessions, roundStates, clock: systemClock },
      { sessionId: id },
    );
    expect(after.totalChallenges).toBe(before.totalChallenges);
    expect(after.challenges.map((c) => c.challengeId).sort()).toEqual(
      before.challenges.map((c) => c.challengeId).sort(),
    );
  });

  it('19. desativar a Word não remove o desafio da rodada existente', async () => {
    const { id } = await startedSession();
    const before = await getRoundState(
      { sessions, roundStates, clock: systemClock },
      { sessionId: id },
    );
    await prisma.word.updateMany({ data: { status: 'INACTIVE' } });
    const after = await getRoundState(
      { sessions, roundStates, clock: systemClock },
      { sessionId: id },
    );
    expect(after.totalChallenges).toBe(before.totalChallenges);
    expect(after.challenges).toHaveLength(before.challenges.length);
  });
});
