/**
 * Adapter Prisma do módulo de rodada. Implementa o `GameSessionRepository`
 * definido em `@/modules/round` e traduz violações do banco para erros de
 * domínio.
 */
export { PrismaGameSessionRepository } from '@/infrastructure/prisma/round/prisma-game-session-repository';
