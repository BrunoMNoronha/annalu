/**
 * Estado de uma resposta do jogador. Espelha o enum físico `PlayerAnswerState`
 * do Prisma sem acoplar o domínio ao cliente gerado. Esta fatia trata apenas o
 * rascunho textual (`DRAFT`); os demais estados são de fatias futuras.
 */
export type PlayerAnswerState =
  | 'DRAFT'
  | 'COMPLETE'
  | 'SUBMITTED'
  | 'PRESERVED_AFTER_EXPIRATION'
  | 'IN_EVALUATION';
