import { PrismaClient } from '@prisma/client';

/**
 * Helpers dos testes de integração + guard de segurança do banco.
 *
 * NUNCA executa TRUNCATE/reset sem confirmar que a URL aponta para um banco de
 * teste (nome contém `_test`, `test` ou `integration`).
 */
const TEST_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

function databaseName(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, '').split('?')[0] ?? '';
  } catch {
    return '';
  }
}

/** Garante que a URL é de um banco descartável de teste. Lança se não for. */
export function assertTestDatabase(url: string = TEST_URL): string {
  if (!url) {
    throw new Error(
      'Guard: TEST_DATABASE_URL/DATABASE_URL não definida para integração.',
    );
  }
  const name = databaseName(url);
  if (!/(_test|test|integration)/i.test(name)) {
    throw new Error(
      `Guard: banco "${name}" não parece de teste; operação destrutiva abortada.`,
    );
  }
  return url;
}

export function createTestPrisma(): PrismaClient {
  const url = assertTestDatabase();
  return new PrismaClient({ datasources: { db: { url } } });
}

// Ordem não importa com CASCADE; lista todas as tabelas do domínio.
const TABLES = [
  'score_transactions',
  'evaluation_events',
  'evaluations',
  'submitted_images',
  'player_answers',
  'session_challenges',
  'game_sessions',
  'game_configurations',
  'accepted_answers',
  'riddles',
  'words',
  'consent_records',
  'auth_identities',
  'players',
  'guardians',
  'admin_users',
  'audit_logs',
];

/** Limpa todas as tabelas (guardado). Só roda contra banco de teste. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  assertTestDatabase();
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
}
