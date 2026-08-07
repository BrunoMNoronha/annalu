/**
 * Estado de curadoria de conteúdo (palavra/charada). Espelha o enum físico
 * `ContentStatus` do Prisma sem acoplar o domínio ao cliente gerado.
 */
export type ContentStatus = 'ACTIVE' | 'INACTIVE';
