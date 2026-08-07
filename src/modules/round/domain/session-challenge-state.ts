/**
 * Estado de um desafio dentro de uma rodada. Espelha o enum físico
 * `SessionChallengeState` do Prisma sem acoplar o domínio ao cliente gerado.
 * Na criação da rodada, todo desafio nasce em `PENDING`.
 */
export type SessionChallengeState =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETE'
  | 'SUBMITTED'
  | 'SKIPPED'
  | 'EXPIRED_INCOMPLETE';
