import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import process from 'node:process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { assertTestDatabase, createTestPrisma, resetDatabase } from './helpers';

/**
 * Migration + seed (cenários 1–3): o seed roda duas vezes sem duplicar.
 * (A aplicação da migration em banco vazio é feita pelo CI via `migrate deploy`
 * antes desta suíte; aqui validamos a idempotência do seed.)
 */
const run = promisify(execFile);
let prisma: PrismaClient;

async function runSeed(): Promise<void> {
  const url = assertTestDatabase();
  await run(
    process.execPath,
    [path.join(process.cwd(), 'prisma', 'seed.mjs')],
    {
      env: { ...process.env, DATABASE_URL: url },
    },
  );
}

async function counts(): Promise<Record<string, number>> {
  return {
    admin: await prisma.adminUser.count(),
    authIdentity: await prisma.authIdentity.count(),
    guardian: await prisma.guardian.count(),
    player: await prisma.player.count(),
    consent: await prisma.consentRecord.count(),
    word: await prisma.word.count(),
    riddle: await prisma.riddle.count(),
    acceptedAnswer: await prisma.acceptedAnswer.count(),
    config: await prisma.gameConfiguration.count(),
  };
}

beforeAll(async () => {
  prisma = createTestPrisma();
  await resetDatabase(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('seed fictício e idempotente', () => {
  it('1-3. roda duas vezes sem duplicar registros', async () => {
    await runSeed();
    const first = await counts();

    // fixtures mínimas esperadas
    expect(first.admin).toBeGreaterThanOrEqual(1);
    expect(first.guardian).toBeGreaterThanOrEqual(1);
    expect(first.player).toBeGreaterThanOrEqual(1);
    expect(first.word).toBeGreaterThanOrEqual(1);
    expect(first.riddle).toBeGreaterThanOrEqual(2);
    expect(first.acceptedAnswer).toBeGreaterThanOrEqual(2);
    expect(first.authIdentity).toBeGreaterThanOrEqual(2);
    expect(first.config).toBe(1);

    await runSeed();
    const second = await counts();

    expect(second).toEqual(first);
  });
});
