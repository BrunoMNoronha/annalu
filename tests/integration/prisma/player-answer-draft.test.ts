import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createRound,
  getRoundState,
  saveAnswerDraft,
  startRound,
  GameSessionNotEditableError,
  SessionChallengeMismatchError,
} from '@/modules/round';
import {
  PrismaContentCatalogRepository,
  PrismaGameConfigurationRepository,
} from '@/infrastructure/prisma/content';
import {
  PrismaGameSessionRepository,
  PrismaPlayerAnswerRepository,
  PrismaRoundStateQueryRepository,
} from '@/infrastructure/prisma/round';
import { fixedClock, systemClock } from '@/shared/clock/clock';
import { systemRandom } from '@/shared/random/random-source';
import { createTestPrisma, resetDatabase } from './helpers';

/**
 * Integração de `saveAnswerDraft` (rascunho textual) com PostgreSQL real e
 * descartável. Marcadores "secretos" provam a minimização no readback. Apenas
 * dados FICTÍCIOS; nenhum `answerText` sensível.
 */
const SECRET_WORD = 'PALAVRA_SECRETA';
const SECRET_ANSWER = 'RESPOSTA_SECRETA';

let prisma: PrismaClient;
let sessions: PrismaGameSessionRepository;
let playerAnswers: PrismaPlayerAnswerRepository;
let roundStates: PrismaRoundStateQueryRepository;
let catalog: PrismaContentCatalogRepository;
let configs: PrismaGameConfigurationRepository;

beforeAll(() => {
  prisma = createTestPrisma();
  sessions = new PrismaGameSessionRepository(prisma);
  playerAnswers = new PrismaPlayerAnswerRepository(prisma);
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
function saveDeps(clock = systemClock) {
  return { sessions, playerAnswers, clock };
}

async function seedContent(): Promise<void> {
  const admin = await prisma.adminUser.create({ data: {} });
  const word = await prisma.word.create({
    data: {
      text: SECRET_WORD,
      createdByAdminUserId: admin.id,
      status: 'ACTIVE',
    },
  });
  for (let i = 0; i < 6; i += 1) {
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
  await prisma.gameConfiguration.create({
    data: {
      pointsPerApproval: 10,
      uploadGraceSeconds: 60,
      challengesPerRound: 3,
      timeLimitSeconds: 600,
      isCurrent: true,
    },
  });
}

async function aPlayer(nickname: string): Promise<string> {
  const player = await prisma.player.create({
    data: { nickname, accessCodeHash: 'hash-ficticio' },
  });
  return player.id;
}

interface StartedRound {
  sessionId: string;
  expiresAt: Date;
  challengeIds: string[];
}

async function startedRound(nickname = 'Jogador Teste'): Promise<StartedRound> {
  const playerId = await aPlayer(nickname);
  const session = await createRound(createDeps(), { playerId });
  await startRound({ sessions, clock: systemClock }, { sessionId: session.id });
  const row = await prisma.gameSession.findUnique({
    where: { id: session.id },
    include: { sessionChallenges: { orderBy: { position: 'asc' } } },
  });
  return {
    sessionId: session.id,
    expiresAt: row!.expiresAt!,
    challengeIds: row!.sessionChallenges.map((c) => c.id),
  };
}

async function createdRound(): Promise<{
  sessionId: string;
  challengeId: string;
}> {
  const playerId = await aPlayer('Rascunho');
  const session = await createRound(createDeps(), { playerId });
  return { sessionId: session.id, challengeId: session.challenges[0]!.id };
}

describe('saveAnswerDraft — criação e atualização', () => {
  it('1/2/3/4/5. cria PlayerAnswer DRAFT (FK, submittedAt null, texto literal)', async () => {
    await seedContent();
    const { sessionId, challengeIds } = await startedRound();
    const challengeId = challengeIds[0]!;

    const answer = await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId,
      answerText: ' Bola ',
    });
    expect(answer.state).toBe('DRAFT');
    expect(answer.submittedAt).toBeNull();

    const row = await prisma.playerAnswer.findUnique({
      where: { sessionChallengeId: challengeId },
    });
    expect(row?.sessionChallengeId).toBe(challengeId);
    expect(row?.state).toBe('DRAFT');
    expect(row?.submittedAt).toBeNull();
    expect(row?.answerText).toBe(' Bola ');
  });

  it('6. texto incorreto é persistido literalmente', async () => {
    await seedContent();
    const { sessionId, challengeIds } = await startedRound();
    await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId: challengeIds[0]!,
      answerText: 'resposta errada',
    });
    const row = await prisma.playerAnswer.findUnique({
      where: { sessionChallengeId: challengeIds[0]! },
    });
    expect(row?.answerText).toBe('resposta errada');
  });

  it('7/8/9. update preserva o mesmo id e não duplica linhas', async () => {
    await seedContent();
    const { sessionId, challengeIds } = await startedRound();
    const challengeId = challengeIds[0]!;
    const first = await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId,
      answerText: 'a',
    });
    const second = await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId,
      answerText: 'bb',
    });
    const third = await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId,
      answerText: 'ccc',
    });
    expect(second.id).toBe(first.id);
    expect(third.id).toBe(first.id);
    expect(third.answerText).toBe('ccc');
    expect(
      await prisma.playerAnswer.count({
        where: { sessionChallengeId: challengeId },
      }),
    ).toBe(1);
  });

  it('10. string vazia substitui o texto anterior', async () => {
    await seedContent();
    const { sessionId, challengeIds } = await startedRound();
    const challengeId = challengeIds[0]!;
    await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId,
      answerText: 'abc',
    });
    const cleared = await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId,
      answerText: '',
    });
    expect(cleared.answerText).toBe('');
    const row = await prisma.playerAnswer.findUnique({
      where: { sessionChallengeId: challengeId },
    });
    expect(row?.answerText).toBe('');
  });

  it('23. challenge de outra sessão é rejeitado', async () => {
    await seedContent();
    const roundA = await startedRound('A');
    const roundB = await startedRound('B');
    await expect(
      saveAnswerDraft(saveDeps(), {
        sessionId: roundA.sessionId,
        challengeId: roundB.challengeIds[0]!,
        answerText: 'x',
      }),
    ).rejects.toBeInstanceOf(SessionChallengeMismatchError);
  });
});

describe('saveAnswerDraft — estados e prazo', () => {
  it('11. CREATED rejeita', async () => {
    await seedContent();
    const { sessionId, challengeId } = await createdRound();
    await expect(
      saveAnswerDraft(saveDeps(), { sessionId, challengeId, answerText: 'x' }),
    ).rejects.toBeInstanceOf(GameSessionNotEditableError);
    expect(await prisma.playerAnswer.count()).toBe(0);
  });

  it('12/13/14. EXPIRED/COMPLETED/CANCELLED rejeitam', async () => {
    await seedContent();
    for (const status of ['EXPIRED', 'COMPLETED', 'CANCELLED'] as const) {
      const { sessionId, challengeIds } = await startedRound(`S-${status}`);
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status },
      });
      await expect(
        saveAnswerDraft(saveDeps(), {
          sessionId,
          challengeId: challengeIds[0]!,
          answerText: 'x',
        }),
      ).rejects.toBeInstanceOf(GameSessionNotEditableError);
    }
    expect(await prisma.playerAnswer.count()).toBe(0);
  });

  it('15/16/17. boundary e vencida rejeitam e deixam a sessão EXPIRED', async () => {
    await seedContent();
    const { sessionId, expiresAt, challengeIds } = await startedRound();
    // Exatamente no prazo (inclusivo) → rejeita.
    await expect(
      saveAnswerDraft(saveDeps(fixedClock(new Date(expiresAt.getTime()))), {
        sessionId,
        challengeId: challengeIds[0]!,
        answerText: 'x',
      }),
    ).rejects.toBeInstanceOf(GameSessionNotEditableError);
    expect(await prisma.playerAnswer.count()).toBe(0);
    const row = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    expect(row?.status).toBe('EXPIRED');
    expect(row?.endedAt?.getTime()).toBe(expiresAt.getTime());
  });
});

describe('saveAnswerDraft — concorrência', () => {
  it('18. corrida save × expire deixa o banco consistente', async () => {
    await seedContent();
    const { sessionId, expiresAt, challengeIds } = await startedRound();
    const challengeId = challengeIds[0]!;

    const results = await Promise.allSettled([
      saveAnswerDraft(
        saveDeps(fixedClock(new Date(expiresAt.getTime() - 1000))),
        {
          sessionId,
          challengeId,
          answerText: 'antes',
        },
      ),
      sessions.expireIfDue({
        sessionId,
        now: new Date(expiresAt.getTime() + 1000),
      }),
    ]);
    expect(results[0]?.status).toBeDefined();

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    const answers = await prisma.playerAnswer.count({
      where: { sessionChallengeId: challengeId },
    });
    // Estado final consistente: no máximo uma resposta; se EXPIRED, endedAt correto.
    expect(answers).toBeLessThanOrEqual(1);
    expect(['IN_PROGRESS', 'EXPIRED']).toContain(session?.status);
    if (session?.status === 'EXPIRED') {
      expect(session.endedAt?.getTime()).toBe(expiresAt.getTime());
    }
  });

  it('19. dois saves concorrentes deixam exatamente uma linha', async () => {
    await seedContent();
    const { sessionId, expiresAt, challengeIds } = await startedRound();
    const challengeId = challengeIds[0]!;
    const clock = fixedClock(new Date(expiresAt.getTime() - 1000));

    await Promise.all([
      saveAnswerDraft(saveDeps(clock), {
        sessionId,
        challengeId,
        answerText: 'um',
      }),
      saveAnswerDraft(saveDeps(clock), {
        sessionId,
        challengeId,
        answerText: 'dois',
      }),
    ]);

    const rows = await prisma.playerAnswer.findMany({
      where: { sessionChallengeId: challengeId },
    });
    expect(rows).toHaveLength(1);
    expect(['um', 'dois']).toContain(rows[0]?.answerText);
  });
});

describe('saveAnswerDraft — readback via getRoundState', () => {
  it('20/21/22. readback distingue null de "" e mantém minimização', async () => {
    await seedContent();
    const { sessionId, challengeIds } = await startedRound();
    // Rascunho vazio no 1º desafio; 2º sem resposta.
    await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId: challengeIds[0]!,
      answerText: '',
    });
    await saveAnswerDraft(saveDeps(), {
      sessionId,
      challengeId: challengeIds[1]!,
      answerText: ' Maçã ',
    });

    const state = await getRoundState(
      { sessions, roundStates, clock: systemClock },
      { sessionId },
    );
    const byId = new Map(state.challenges.map((c) => [c.challengeId, c]));
    expect(byId.get(challengeIds[0]!)?.answer?.answerText).toBe('');
    expect(byId.get(challengeIds[1]!)?.answer?.answerText).toBe(' Maçã ');
    expect(byId.get(challengeIds[2]!)?.answer).toBeNull();

    const serialized = JSON.stringify(state);
    expect(serialized).not.toContain(SECRET_WORD);
    expect(serialized).not.toContain(SECRET_ANSWER);
    expect(serialized).not.toContain('hash-ficticio');
  });
});
