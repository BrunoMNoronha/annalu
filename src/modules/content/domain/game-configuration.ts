/**
 * Visão de leitura da configuração vigente do jogo (somente leitura nesta
 * fatia). A unicidade de "configuração atual" é garantida pelo banco (índice
 * único parcial `WHERE is_current = true`).
 */
export interface CurrentGameConfiguration {
  readonly id: string;
  readonly pointsPerApproval: number;
  readonly uploadGraceSeconds: number;
  readonly challengesPerRound: number;
  readonly timeLimitSeconds: number;
  readonly isCurrent: true;
}
