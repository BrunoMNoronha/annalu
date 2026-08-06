import { describe, expect, it } from 'vitest';
import { createLogger } from '@/shared/logger/logger';

function captureLogger(level: 'debug' | 'info' | 'warn' | 'error') {
  const lines: string[] = [];
  const logger = createLogger({
    level,
    sink: (line) => lines.push(line),
    now: () => new Date('2026-08-05T00:00:00.000Z'),
  });
  return { logger, lines };
}

describe('logger estruturado', () => {
  it('emite JSON com nível, time e mensagem', () => {
    const { logger, lines } = captureLogger('info');
    logger.info('aplicacao iniciada', { rota: '/api/health' });

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0] as string);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('aplicacao iniciada');
    expect(entry.time).toBe('2026-08-05T00:00:00.000Z');
    expect(entry.rota).toBe('/api/health');
  });

  it('filtra mensagens abaixo do nível mínimo', () => {
    const { logger, lines } = captureLogger('warn');
    logger.debug('nao deve aparecer');
    logger.info('nao deve aparecer');
    logger.warn('deve aparecer');
    expect(lines).toHaveLength(1);
  });

  it('redige chaves sensíveis conhecidas', () => {
    const { logger, lines } = captureLogger('info');
    logger.info('tentativa', {
      password: 'super-secreta',
      email: 'pessoa@example.com',
      rota: '/publica',
    });
    const entry = JSON.parse(lines[0] as string);
    expect(entry.password).toBe('[redacted]');
    expect(entry.email).toBe('[redacted]');
    expect(entry.rota).toBe('/publica');
  });
});
