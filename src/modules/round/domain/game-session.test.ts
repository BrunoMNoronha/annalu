import { describe, expect, it } from 'vitest';
import {
  assertCanStart,
  computeExpiresAt,
  isExpiredAt,
  remainingMilliseconds,
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

describe('isExpiredAt', () => {
  const expiresAt = new Date('2026-08-07T12:10:00.000Z');

  it('não está vencida antes do prazo (now < expiresAt)', () => {
    expect(isExpiredAt(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(
      false,
    );
  });

  it('está vencida exatamente no prazo (now == expiresAt, boundary inclusivo)', () => {
    expect(isExpiredAt(expiresAt, new Date(expiresAt.getTime()))).toBe(true);
  });

  it('está vencida após o prazo (now > expiresAt)', () => {
    expect(isExpiredAt(expiresAt, new Date(expiresAt.getTime() + 1))).toBe(
      true,
    );
  });
});

describe('remainingMilliseconds', () => {
  const expiresAt = new Date('2026-08-07T12:10:00.000Z');

  it('IN_PROGRESS antes do prazo → max(0, expiresAt - serverNow)', () => {
    expect(
      remainingMilliseconds(
        'IN_PROGRESS',
        expiresAt,
        new Date(expiresAt.getTime() - 5000),
      ),
    ).toBe(5000);
  });

  it('IN_PROGRESS após o prazo → 0 (nunca negativo)', () => {
    expect(
      remainingMilliseconds(
        'IN_PROGRESS',
        expiresAt,
        new Date(expiresAt.getTime() + 5000),
      ),
    ).toBe(0);
  });

  it('EXPIRED → 0', () => {
    expect(remainingMilliseconds('EXPIRED', expiresAt, expiresAt)).toBe(0);
  });

  it('CREATED/COMPLETED/CANCELLED → null', () => {
    const statuses: GameSessionStatus[] = ['CREATED', 'COMPLETED', 'CANCELLED'];
    for (const status of statuses) {
      expect(remainingMilliseconds(status, expiresAt, expiresAt)).toBeNull();
    }
  });
});
