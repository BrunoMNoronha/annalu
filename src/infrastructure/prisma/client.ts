import { PrismaClient } from '@prisma/client';

/**
 * Instância única do PrismaClient (evita esgotar conexões em hot-reload).
 *
 * NOTA: nenhum modelo de domínio foi definido ainda (ver prisma/schema.prisma e
 * docs/12-decisoes-pendentes.md). Este wrapper existe para estabelecer a
 * fronteira de infraestrutura; ainda não é consumido por regras de negócio.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
