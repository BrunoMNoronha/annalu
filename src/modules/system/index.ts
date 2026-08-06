/**
 * Ponto de entrada público do módulo "system".
 * Consumidores externos importam daqui, não dos arquivos internos.
 */
export { getHealthStatus } from '@/modules/system/application/get-health-status';
export {
  createHealthStatus,
  type HealthStatus,
  type HealthState,
} from '@/modules/system/domain/health-status';
