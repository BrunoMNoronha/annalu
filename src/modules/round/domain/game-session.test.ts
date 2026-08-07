import { describe, expect, it } from 'vitest';
import {
  assertCanStart,
  computeExpiresAt,
  type GameSessionStatus,
} from '@/modules/round/domain/game-session';
import { InvalidGameSessionStateTransitionError } from '@/modules/round/domain/errors';

describe('assertCanStart', () => {
  it('permite iniciar uma rodada em CREATED', () => {
    expect(() => assertCanStart('CREATED')).not.toThrow();
  });

  it('rejeita iniciar a partir de qualquer outro estado', () => {
    const invalid: GameSessionStatus[] = [
      'IN_PROGRESS',
      'COMPLETED',
      'EXPIRED',
      'CANCELLED',
    ];
    for (const status of invalid) {
      expect(() => assertCanStart(status)).toThrow(
        InvalidGameSessionStateTransitionError,
      );
    }
  });
});

describe('computeExpiresAt', () => {
  it('soma o tempo limite (em segundos) ao instante de início', () => {
    const startedAt = new Date('2026-08-07T12:00:00.000Z');
    expect(computeExpiresAt(startedAt, 600)).toEqual(
      new Date('2026-08-07T12:10:00.000Z'),
    );
  });

  it('não muta o Date de entrada', () => {
    const startedAt = new Date('2026-08-07T12:00:00.000Z');
    computeExpiresAt(startedAt, 120);
    expect(startedAt.toISOString()).toBe('2026-08-07T12:00:00.000Z');
  });
});
