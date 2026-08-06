import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createTestPrisma, resetDatabase } from './helpers';

/**
 * Invariantes GARANTIDAS PELO BANCO (constraints/índices). Regras que dependem
 * de serviço transacional futuro NÃO são testadas aqui (ver docs/14).
 */
let prisma: PrismaClient;

beforeAll(() => {
  prisma = createTestPrisma();
});
afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetDatabase(prisma);
});

// ---------- fábricas ----------
const HASH = 'FIXTURE_hash_do_not_authenticate';
let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

function admin() {
  return prisma.adminUser.create({ data: {} });
}
function guardian() {
  return prisma.guardian.create({ data: {} });
}
function player(guardianId?: string, publicTag?: string) {
  return prisma.player.create({
    data: { nickname: 'Fixture', accessCodeHash: HASH, guardianId, publicTag },
  });
}
async function word() {
  const a = await admin();
  return prisma.word.create({
    data: { text: `w-${uniq()}`, createdByAdminUserId: a.id },
  });
}
async function riddle(wordId?: string) {
  const w = wordId ? { id: wordId } : await word();
  return prisma.riddle.create({
    data: { wordId: w.id, prompt: `p-${uniq()}` },
  });
}
function config(overrides: Record<string, unknown> = {}) {
  return prisma.gameConfiguration.create({
    data: {
      pointsPerApproval: 10,
      uploadGraceSeconds: 60,
      challengesPerRound: 5,
      timeLimitSeconds: 600,
      ...overrides,
    },
  });
}
async function session() {
  const p = await player();
  const c = await config();
  const s = await prisma.gameSession.create({
    data: {
      playerId: p.id,
      configurationId: c.id,
      pointsPerApprovalSnapshot: c.pointsPerApproval,
      uploadGraceSecondsSnapshot: c.uploadGraceSeconds,
      challengesCountSnapshot: c.challengesPerRound,
      timeLimitSecondsSnapshot: c.timeLimitSeconds,
    },
  });
  return { player: p, configuration: c, session: s };
}
function challenge(sessionId: string, riddleId: string, position: number) {
  return prisma.sessionChallenge.create({
    data: { sessionId, riddleId, position },
  });
}
function answer(sessionChallengeId: string) {
  return prisma.playerAnswer.create({ data: { sessionChallengeId } });
}
function evaluation(playerAnswerId: string) {
  return prisma.evaluation.create({ data: { playerAnswerId } });
}
function event(
  evaluationId: string,
  adminUserId: string,
  applied: 'APPROVED' | 'REJECTED',
  type: 'INITIAL_DECISION' | 'REVISION' | 'CORRECTION',
  previousEventId?: string,
) {
  return prisma.evaluationEvent.create({
    data: {
      evaluationId,
      adminUserId,
      appliedResult: applied,
      eventType: type,
      previousEventId,
    },
  });
}

// ---------- Identidades ----------
describe('identidades', () => {
  it('4. apelidos iguais são permitidos', async () => {
    await player(undefined, undefined);
    await expect(player(undefined, undefined)).resolves.toBeTruthy();
    const count = await prisma.player.count({ where: { nickname: 'Fixture' } });
    expect(count).toBe(2);
  });

  it('5. publicTag duplicado é rejeitado', async () => {
    await player(undefined, 'TAG-1');
    await expect(player(undefined, 'TAG-1')).rejects.toThrow();
  });

  it('6. código sem hash é rejeitado', async () => {
    await expect(
      prisma.player.create({
        data: { nickname: 'x', accessCodeHash: undefined as unknown as string },
      }),
    ).rejects.toThrow();
  });

  it('7. AuthIdentity sem proprietário é rejeitada', async () => {
    await expect(
      prisma.authIdentity.create({
        data: { provider: 'EMAIL', externalIdentifier: `e-${uniq()}` },
      }),
    ).rejects.toThrow();
  });

  it('8. AuthIdentity com dois proprietários é rejeitada', async () => {
    const g = await guardian();
    const a = await admin();
    await expect(
      prisma.authIdentity.create({
        data: {
          provider: 'EMAIL',
          externalIdentifier: `e-${uniq()}`,
          guardianId: g.id,
          adminUserId: a.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('9. provider + externalIdentifier duplicado é rejeitado', async () => {
    const g = await guardian();
    const ext = `dup-${uniq()}`;
    await prisma.authIdentity.create({
      data: { provider: 'EMAIL', externalIdentifier: ext, guardianId: g.id },
    });
    const g2 = await guardian();
    await expect(
      prisma.authIdentity.create({
        data: { provider: 'EMAIL', externalIdentifier: ext, guardianId: g2.id },
      }),
    ).rejects.toThrow();
  });
});

// ---------- Conteúdo ----------
describe('conteúdo', () => {
  it('10. uma palavra aceita várias charadas', async () => {
    const w = await word();
    await riddle(w.id);
    await riddle(w.id);
    expect(await prisma.riddle.count({ where: { wordId: w.id } })).toBe(2);
  });

  it('11. uma charada aceita várias respostas', async () => {
    const r = await riddle();
    await prisma.acceptedAnswer.create({
      data: { riddleId: r.id, text: 'A', normalizedText: 'a' },
    });
    await prisma.acceptedAnswer.create({
      data: { riddleId: r.id, text: 'B', normalizedText: 'b' },
    });
    expect(
      await prisma.acceptedAnswer.count({ where: { riddleId: r.id } }),
    ).toBe(2);
  });

  it('12. resposta normalizada duplicada na mesma charada é rejeitada', async () => {
    const r = await riddle();
    await prisma.acceptedAnswer.create({
      data: { riddleId: r.id, text: 'Copo', normalizedText: 'copo' },
    });
    await expect(
      prisma.acceptedAnswer.create({
        data: { riddleId: r.id, text: 'copo', normalizedText: 'copo' },
      }),
    ).rejects.toThrow();
  });
});

// ---------- Configuração ----------
describe('configuração', () => {
  it('13. valores não positivos são rejeitados', async () => {
    await expect(config({ pointsPerApproval: 0 })).rejects.toThrow();
    await expect(config({ challengesPerRound: 0 })).rejects.toThrow();
    await expect(config({ timeLimitSeconds: 0 })).rejects.toThrow();
    await expect(config({ uploadGraceSeconds: -1 })).rejects.toThrow();
  });

  it('14. duas configurações atuais são rejeitadas', async () => {
    await config({ isCurrent: true });
    await expect(config({ isCurrent: true })).rejects.toThrow();
  });

  it('15. configuração histórica não atual é permitida', async () => {
    await config({ isCurrent: true });
    await expect(config({ isCurrent: false })).resolves.toBeTruthy();
    await expect(config({ isCurrent: false })).resolves.toBeTruthy();
  });
});

// ---------- Rodada ----------
describe('rodada', () => {
  it('16. posição repetida na mesma rodada é rejeitada', async () => {
    const { session: s } = await session();
    const r1 = await riddle();
    const r2 = await riddle();
    await challenge(s.id, r1.id, 1);
    await expect(challenge(s.id, r2.id, 1)).rejects.toThrow();
  });

  it('17. charada repetida na mesma rodada é rejeitada', async () => {
    const { session: s } = await session();
    const r = await riddle();
    await challenge(s.id, r.id, 1);
    await expect(challenge(s.id, r.id, 2)).rejects.toThrow();
  });

  it('18. a rodada preserva snapshots após mudança na configuração', async () => {
    const { session: s, configuration: c } = await session();
    await prisma.gameConfiguration.update({
      where: { id: c.id },
      data: { pointsPerApproval: 999, timeLimitSeconds: 999 },
    });
    const again = await prisma.gameSession.findUniqueOrThrow({
      where: { id: s.id },
    });
    expect(again.pointsPerApprovalSnapshot).toBe(10);
    expect(again.timeLimitSecondsSnapshot).toBe(600);
  });
});

// ---------- Resposta e imagem ----------
describe('resposta e imagem', () => {
  async function oneAnswer() {
    const { session: s } = await session();
    const r = await riddle();
    const ch = await challenge(s.id, r.id, 1);
    return answer(ch.id);
  }

  it('19. duas respostas para o mesmo desafio são rejeitadas', async () => {
    const { session: s } = await session();
    const r = await riddle();
    const ch = await challenge(s.id, r.id, 1);
    await answer(ch.id);
    await expect(answer(ch.id)).rejects.toThrow();
  });

  it('20. duas imagens atuais para a mesma resposta são rejeitadas', async () => {
    const ans = await oneAnswer();
    await prisma.submittedImage.create({
      data: { playerAnswerId: ans.id, storageKey: `k-${uniq()}` },
    });
    await expect(
      prisma.submittedImage.create({
        data: { playerAnswerId: ans.id, storageKey: `k-${uniq()}` },
      }),
    ).rejects.toThrow();
  });

  it('21. tamanho inválido é rejeitado', async () => {
    const ans = await oneAnswer();
    await expect(
      prisma.submittedImage.create({
        data: {
          playerAnswerId: ans.id,
          storageKey: `k-${uniq()}`,
          sizeBytes: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it('22. tentativas negativas de expurgo são rejeitadas', async () => {
    const ans = await oneAnswer();
    await expect(
      prisma.submittedImage.create({
        data: {
          playerAnswerId: ans.id,
          storageKey: `k-${uniq()}`,
          purgeAttempts: -1,
        },
      }),
    ).rejects.toThrow();
  });
});

// ---------- Avaliação e pontuação ----------
describe('avaliação e pontuação', () => {
  async function oneAnswer() {
    const { session: s } = await session();
    const r = await riddle();
    const ch = await challenge(s.id, r.id, 1);
    return answer(ch.id);
  }

  it('23. Evaluation pendente sem eventos é permitida', async () => {
    const ans = await oneAnswer();
    const ev = await evaluation(ans.id);
    expect(ev.currentResult).toBe('PENDING');
    expect(
      await prisma.evaluationEvent.count({ where: { evaluationId: ev.id } }),
    ).toBe(0);
  });

  it('24. segunda Evaluation para a mesma resposta é rejeitada', async () => {
    const ans = await oneAnswer();
    await evaluation(ans.id);
    await expect(evaluation(ans.id)).rejects.toThrow();
  });

  it('25. uma avaliação aceita vários eventos sequenciais', async () => {
    const ans = await oneAnswer();
    const a = await admin();
    const ev = await evaluation(ans.id);
    const e1 = await event(ev.id, a.id, 'APPROVED', 'INITIAL_DECISION');
    const e2 = await event(ev.id, a.id, 'REJECTED', 'REVISION', e1.id);
    await event(ev.id, a.id, 'APPROVED', 'CORRECTION', e2.id);
    expect(
      await prisma.evaluationEvent.count({ where: { evaluationId: ev.id } }),
    ).toBe(3);
  });

  it('26. um evento não pode referenciar a si próprio', async () => {
    const ans = await oneAnswer();
    const a = await admin();
    const ev = await evaluation(ans.id);
    const e1 = await event(ev.id, a.id, 'APPROVED', 'INITIAL_DECISION');
    await expect(
      prisma.evaluationEvent.update({
        where: { id: e1.id },
        data: { previousEventId: e1.id },
      }),
    ).rejects.toThrow();
  });

  it('27. dois eventos não podem usar o mesmo previousEventId', async () => {
    const ans = await oneAnswer();
    const a = await admin();
    const ev = await evaluation(ans.id);
    const e1 = await event(ev.id, a.id, 'APPROVED', 'INITIAL_DECISION');
    await event(ev.id, a.id, 'REJECTED', 'REVISION', e1.id);
    await expect(
      event(ev.id, a.id, 'APPROVED', 'CORRECTION', e1.id),
    ).rejects.toThrow();
  });

  it('28. um mesmo evento não aceita duas ScoreTransaction', async () => {
    const ans = await oneAnswer();
    const a = await admin();
    const ev = await evaluation(ans.id);
    const e1 = await event(ev.id, a.id, 'APPROVED', 'INITIAL_DECISION');
    const pa = await prisma.playerAnswer.findUniqueOrThrow({
      where: { id: ans.id },
      include: {
        sessionChallenge: { include: { session: true } },
      },
    });
    const playerId = pa.sessionChallenge.session.playerId;
    await prisma.scoreTransaction.create({
      data: { playerId, evaluationEventId: e1.id, points: 10 },
    });
    await expect(
      prisma.scoreTransaction.create({
        data: { playerId, evaluationEventId: e1.id, points: 10 },
      }),
    ).rejects.toThrow();
  });

  it('29. transação de zero ponto é rejeitada', async () => {
    const ans = await oneAnswer();
    const a = await admin();
    const ev = await evaluation(ans.id);
    const e1 = await event(ev.id, a.id, 'APPROVED', 'INITIAL_DECISION');
    const p = await player();
    await expect(
      prisma.scoreTransaction.create({
        data: { playerId: p.id, evaluationEventId: e1.id, points: 0 },
      }),
    ).rejects.toThrow();
  });

  it('30. sequência +10, -10, +10 em eventos distintos soma 10', async () => {
    const ans = await oneAnswer();
    const a = await admin();
    const p = await player();
    const ev = await evaluation(ans.id);
    const e1 = await event(ev.id, a.id, 'APPROVED', 'INITIAL_DECISION');
    const e2 = await event(ev.id, a.id, 'REJECTED', 'REVISION', e1.id);
    const e3 = await event(ev.id, a.id, 'APPROVED', 'CORRECTION', e2.id);
    await prisma.scoreTransaction.create({
      data: { playerId: p.id, evaluationEventId: e1.id, points: 10 },
    });
    await prisma.scoreTransaction.create({
      data: { playerId: p.id, evaluationEventId: e2.id, points: -10 },
    });
    await prisma.scoreTransaction.create({
      data: { playerId: p.id, evaluationEventId: e3.id, points: 10 },
    });
    const agg = await prisma.scoreTransaction.aggregate({
      where: { playerId: p.id },
      _sum: { points: true },
    });
    expect(agg._sum.points).toBe(10);
  });

  it('31. rejeição inicial pode existir sem ScoreTransaction', async () => {
    const ans = await oneAnswer();
    const a = await admin();
    const ev = await evaluation(ans.id);
    const e1 = await event(ev.id, a.id, 'REJECTED', 'INITIAL_DECISION');
    expect(
      await prisma.scoreTransaction.count({
        where: { evaluationEventId: e1.id },
      }),
    ).toBe(0);
  });
});
