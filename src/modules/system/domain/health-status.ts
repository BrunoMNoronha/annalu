/**
 * Domínio do módulo "system" — exemplo de separação arquitetural.
 *
 * Este módulo NÃO contém regra de negócio do jogo (charadas, rodadas,
 * pontuação, etc.). Ele existe apenas para demonstrar as camadas
 * domínio → aplicação → apresentação de forma testável.
 */

/** Estado de saúde reportado pela aplicação. */
export type HealthState = 'ok';

/** Representação imutável do estado de saúde. */
export interface HealthStatus {
  readonly status: HealthState;
  /** Momento da verificação, em ISO 8601 (UTC). */
  readonly timestamp: string;
}

/**
 * Cria um `HealthStatus` a partir de um instante.
 * Função pura: mesma entrada, mesma saída — ideal para testes.
 */
export function createHealthStatus(now: Date): HealthStatus {
  return {
    status: 'ok',
    timestamp: now.toISOString(),
  };
}
