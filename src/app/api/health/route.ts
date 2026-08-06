import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/modules/system';
import { systemClock } from '@/shared/clock/clock';

/**
 * GET /api/health — verificação de saúde mínima.
 *
 * Restrições de segurança (docs/08-seguranca-e-privacidade.md):
 * - NÃO revela versões internas, dependências ou variáveis de ambiente.
 * - NÃO testa serviços externos (banco, S3) nesta etapa.
 * - Retorna apenas estado e horário do servidor.
 */
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  const health = getHealthStatus(systemClock);
  return NextResponse.json(health, { status: 200 });
}
