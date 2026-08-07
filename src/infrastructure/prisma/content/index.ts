/**
 * Adapters Prisma do módulo de conteúdo. Implementam os ports definidos em
 * `@/modules/content` e traduzem violações do banco para erros de domínio.
 */
export { PrismaWordRepository } from '@/infrastructure/prisma/content/prisma-word-repository';
export { PrismaRiddleRepository } from '@/infrastructure/prisma/content/prisma-riddle-repository';
export { PrismaAcceptedAnswerRepository } from '@/infrastructure/prisma/content/prisma-accepted-answer-repository';
export { PrismaContentCatalogRepository } from '@/infrastructure/prisma/content/prisma-content-catalog-repository';
export { PrismaGameConfigurationRepository } from '@/infrastructure/prisma/content/prisma-game-configuration-repository';
