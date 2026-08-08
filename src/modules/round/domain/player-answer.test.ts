import { describe, expect, it } from 'vitest';
import {
  assertPlayerAnswerDraft,
  classifyDraftEditability,
} from '@/modules/round/domain/player-answer';
import type { GameSessionStatus } from '@/modules/round/domain/game-session';
import type { PlayerAnswerState } from '@/modules/round/domain/player-answer-state';
import { PlayerAnswerNotDraftError } from '@/modules/round/domain/errors';

const EXPIRES_AT = new Date('2026-08-07T12:10:00.000Z');

describe('classifyDraftEditability', () => {
  it('IN_PROGRESS antes do prazo → editável', () => {
    expect(
      classifyDraftEditability(
        'IN_PROGRESS',
        EXPIRES_AT,
        new Date(EXPIRES_AT.getTime() - 1),
      ),
    ).toEqual({ editable: true });
  });

  it('IN_PROGRESS exatamente no prazo → EXPIRED_DUE (boundary inclusivo)', () => {
    expect(
      classifyDraftEditability('IN_PROGRESS', EXPIRES_AT, EXPIRES_AT),
    ).toEqual({ editable: false, reason: 'EXPIRED_DUE' });
  });

  it('IN_PROGRESS após o prazo → EXPIRED_DUE', () => {
    expect(
      classifyDraftEditability(
        'IN_PROGRESS',
        EXPIRES_AT,
        new Date(EXPIRES_AT.getTime() + 1),
      ),
    ).toEqual({ editable: false, reason: 'EXPIRED_DUE' });
  });

  it('IN_PROGRESS sem expiresAt → NOT_EDITABLE', () => {
    expect(classifyDraftEditability('IN_PROGRESS', null, EXPIRES_AT)).toEqual({
      editable: false,
      reason: 'NOT_EDITABLE',
    });
  });

  it('estados não editáveis (CREATED/EXPIRED/COMPLETED/CANCELLED) → NOT_EDITABLE', () => {
    const statuses: GameSessionStatus[] = [
      'CREATED',
      'EXPIRED',
      'COMPLETED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      expect(
        classifyDraftEditability(
          status,
          EXPIRES_AT,
          new Date(EXPIRES_AT.getTime() - 1),
        ),
      ).toEqual({ editable: false, reason: 'NOT_EDITABLE' });
    }
  });
});

describe('assertPlayerAnswerDraft', () => {
  it('aceita DRAFT', () => {
    expect(() => assertPlayerAnswerDraft('DRAFT')).not.toThrow();
  });

  it('rejeita estados diferentes de DRAFT', () => {
    const others: PlayerAnswerState[] = [
      'COMPLETE',
      'SUBMITTED',
      'PRESERVED_AFTER_EXPIRATION',
      'IN_EVALUATION',
    ];
    for (const state of others) {
      expect(() => assertPlayerAnswerDraft(state)).toThrow(
        PlayerAnswerNotDraftError,
      );
    }
  });
});
