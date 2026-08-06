/**
 * Abstração de relógio para permitir tempo determinístico em testes.
 * A camada de infraestrutura/apresentação injeta uma implementação; o domínio
 * depende apenas desta interface.
 */
export interface Clock {
  now(): Date;
}

/** Relógio real baseado no horário do sistema. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/** Cria um relógio fixo para testes. */
export function fixedClock(date: Date): Clock {
  return { now: () => date };
}
