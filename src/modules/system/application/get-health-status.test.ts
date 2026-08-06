import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '@/modules/system';
import { fixedClock } from '@/shared/clock/clock';

describe('getHealthStatus', () => {
  it('retorna status ok com o horário do relógio injetado', () => {
    const instante = new Date('2026-08-05T12:00:00.000Z');
    const health = getHealthStatus(fixedClock(instante));

    expect(health.status).toBe('ok');
    expect(health.timestamp).toBe('2026-08-05T12:00:00.000Z');
  });

  it('é determinístico para o mesmo instante', () => {
    const instante = new Date('2026-01-01T00:00:00.000Z');
    const a = getHealthStatus(fixedClock(instante));
    const b = getHealthStatus(fixedClock(instante));
    expect(a).toEqual(b);
  });
});
