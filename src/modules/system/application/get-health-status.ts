import type { Clock } from '@/shared/clock/clock';
import {
  createHealthStatus,
  type HealthStatus,
} from '@/modules/system/domain/health-status';

/**
 * Caso de uso: obter o estado de saúde da aplicação.
 *
 * Depende apenas da abstração `Clock` (injeção de dependência), o que mantém a
 * camada de aplicação isolada de detalhes de infraestrutura e facilita testes.
 */
export function getHealthStatus(clock: Clock): HealthStatus {
  return createHealthStatus(clock.now());
}
