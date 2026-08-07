import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  addAcceptedAnswer,
  createRiddle,
  createWord,
  deactivateRiddle,
  deactivateWord,
  getCurrentConfiguration,
  listActiveContent,
  DuplicateAcceptedAnswerError,
  RiddleNotFoundError,
  WordNotFoundError,
} from '@/modules/content';
import {
  PrismaAcceptedAnswerRepository,
  PrismaContentCatalogRepository,
  PrismaGameConfigurationRepository,
  PrismaRiddleRepository,
  PrismaWordRepository,
} from '@/infrastructure/prisma/content';
import { createTestPrisma, resetDatabase } from './helpers';

/**
 * Integração do módulo de conteúdo (PostgreSQL real, descartável). Usa os
 * adapters Prisma reais para exercitar as constraints do banco.
 */
let prisma: PrismaClient;
let words: PrismaWordRepository;
let riddles: PrismaRiddleRepository;
let answers: PrismaAcceptedAnswerRepository;
let catalog: PrismaContentCatalogRepository;
let configs: PrismaGameConfigurationRepository;

beforeAll(() => {
  prisma = createTestPrisma();
  words = new PrismaWordRepository(prisma);
  riddles = new PrismaRiddleRepository(prisma);
  answers = new PrismaAcceptedAnswerRepository(prisma);
  catalog = new PrismaContentCatalogRepository(prisma);
  configs = new PrismaGameConfigurationRepository(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetDatabase(prisma);
});

async function admin(): Promise<string> {
  const a = await prisma.adminUser.create({ data: {} });
  return a.id;
}

async function aWord(): Promise<string> {
  const w = await createWord(words, {
    text: 'copo',
    createdByAdminUserId: await admin(),
  });
  return w.id;
}

describe('conteúdo — palavras, charadas e respostas', () => {
  it('1. cria palavra', async () => {
    const w = await createWord(words, {
      text: 'copo',
      createdByAdminUserId: await admin(),
    });
    expect(w.id).toBeTruthy();
    expect(w.status).toBe('ACTIVE');
  });

  it('2. cria charada associada a uma palavra', async () => {
    const wordId = await aWord();
    const r = await createRiddle(riddles, { wordId, prompt: 'O que é?' });
    expect(r.wordId).toBe(wordId);
  });

  it('3. cria múltiplas respostas aceitas', async () => {
    const wordId = await aWord();
    const r = await createRiddle(riddles, { wordId, prompt: 'O que é?' });
    await addAcceptedAnswer(answers, { riddleId: r.id, text: 'Copo' });
    await addAcceptedAnswer(answers, { riddleId: r.id, text: 'Um copo' });
    expect(await answers.listByRiddle(r.id)).toHaveLength(2);
  });

  it('4. 1:N palavra → charadas', async () => {
    const wordId = await aWord();
    await createRiddle(riddles, { wordId, prompt: 'p1' });
    await createRiddle(riddles, { wordId, prompt: 'p2' });
    const active = await listActiveContent(catalog);
    expect(active[0]?.riddles).toHaveLength(2);
  });

  it('5. 1:N charada → respostas', async () => {
    const wordId = await aWord();
    const r = await createRiddle(riddles, { wordId, prompt: 'p' });
    await addAcceptedAnswer(answers, { riddleId: r.id, text: 'a' });
    await addAcceptedAnswer(answers, { riddleId: r.id, text: 'b' });
    expect(await answers.listByRiddle(r.id)).toHaveLength(2);
  });

  it('6. duplicata normalizada na mesma charada é rejeitada (constraint + adapter)', async () => {
    const wordId = await aWord();
    const r = await createRiddle(riddles, { wordId, prompt: 'p' });
    // Chama o adapter diretamente (ignora a checagem amigável do serviço) para
    // exercitar a unique constraint do banco e o mapeamento do erro.
    await answers.create({
      riddleId: r.id,
      text: 'Copo',
      normalizedText: 'copo',
    });
    await expect(
      answers.create({ riddleId: r.id, text: 'copo', normalizedText: 'copo' }),
    ).rejects.toBeInstanceOf(DuplicateAcceptedAnswerError);
  });

  it('7. mesma resposta normalizada em charadas diferentes é permitida', async () => {
    const wordId = await aWord();
    const r1 = await createRiddle(riddles, { wordId, prompt: 'p1' });
    const r2 = await createRiddle(riddles, { wordId, prompt: 'p2' });
    await addAcceptedAnswer(answers, { riddleId: r1.id, text: 'copo' });
    await expect(
      addAcceptedAnswer(answers, { riddleId: r2.id, text: 'copo' }),
    ).resolves.toBeTruthy();
  });
});

describe('conteúdo — ativação e acervo elegível', () => {
  it('8. desativa palavra', async () => {
    const wordId = await aWord();
    const w = await deactivateWord(words, wordId);
    expect(w.status).toBe('INACTIVE');
  });

  it('9. desativa charada', async () => {
    const wordId = await aWord();
    const r = await createRiddle(riddles, { wordId, prompt: 'p' });
    const updated = await deactivateRiddle(riddles, r.id);
    expect(updated.status).toBe('INACTIVE');
  });

  it('10. conteúdo inativo é excluído de listActiveContent', async () => {
    const wordId = await aWord();
    await createRiddle(riddles, { wordId, prompt: 'p' });
    await deactivateWord(words, wordId);
    expect(await listActiveContent(catalog)).toHaveLength(0);
  });

  it('11. conteúdo ativo é incluído (charada inativa não aparece)', async () => {
    const wordId = await aWord();
    const rAtiva = await createRiddle(riddles, { wordId, prompt: 'ativa' });
    const rInativa = await createRiddle(riddles, { wordId, prompt: 'inativa' });
    await addAcceptedAnswer(answers, { riddleId: rAtiva.id, text: 'copo' });
    await deactivateRiddle(riddles, rInativa.id);

    const active = await listActiveContent(catalog);
    expect(active).toHaveLength(1);
    expect(active[0]?.riddles).toHaveLength(1);
    expect(active[0]?.riddles[0]?.riddle.prompt).toBe('ativa');
    expect(active[0]?.riddles[0]?.acceptedAnswers).toHaveLength(1);
  });
});

describe('conteúdo — configuração vigente', () => {
  it('12. getCurrentConfiguration retorna a configuração atual', async () => {
    await prisma.gameConfiguration.create({
      data: {
        pointsPerApproval: 10,
        uploadGraceSeconds: 60,
        challengesPerRound: 5,
        timeLimitSeconds: 600,
        isCurrent: true,
      },
    });
    const current = await getCurrentConfiguration(configs);
    expect(current?.isCurrent).toBe(true);
    expect(current?.challengesPerRound).toBe(5);
  });

  it('13. getCurrentConfiguration retorna null sem configuração atual', async () => {
    // Só configurações históricas (não atuais).
    await prisma.gameConfiguration.create({
      data: {
        pointsPerApproval: 10,
        uploadGraceSeconds: 60,
        challengesPerRound: 5,
        timeLimitSeconds: 600,
        isCurrent: false,
      },
    });
    expect(await getCurrentConfiguration(configs)).toBeNull();
  });
});

describe('conteúdo — entidade pai inexistente', () => {
  it('14a. criar charada com wordId inexistente → WordNotFoundError', async () => {
    await expect(
      createRiddle(riddles, {
        wordId: '00000000-0000-4000-8000-0000000000ff',
        prompt: 'p',
      }),
    ).rejects.toBeInstanceOf(WordNotFoundError);
  });

  it('14b. adicionar resposta com riddleId inexistente → RiddleNotFoundError', async () => {
    await expect(
      answers.create({
        riddleId: '00000000-0000-4000-8000-0000000000fe',
        text: 'copo',
        normalizedText: 'copo',
      }),
    ).rejects.toBeInstanceOf(RiddleNotFoundError);
  });

  it('14c. setStatus em palavra inexistente → WordNotFoundError', async () => {
    await expect(
      deactivateWord(words, '00000000-0000-4000-8000-0000000000fd'),
    ).rejects.toBeInstanceOf(WordNotFoundError);
  });
});
