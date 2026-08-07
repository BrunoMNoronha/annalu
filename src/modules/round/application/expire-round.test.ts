import { describe, expect, it } from 'vitest';
import { expireRoundIfDue } from '@/modules/round/application/expire-round';
import type {
  ExpireGameSessionInput,
  GameSessionRepository,
  StartGameSessionInput,
} from '@/modules/round/application/ports';
import type {
  GameSession,
  GameSessionStatus,
} from '@/modules/round/domain/game-session';
import { GameSessionNotFoundError } from '@/modules/round/domain/errors';
import { fixedClock } from '@/shared/clock/clock';

const STARTED_AT = new Date('2026-08-07T12:00:00.000Z');
const EXPIRES_AT = new Date('2026-08-07T12:10:00.000Z');

function session(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'session-1',
    playerId: 'player-1',
    configurationId: 'config-1',
    status: 'IN_PROGRESS',
    pointsPerApprovalSnapshot: 10,
    uploadGraceSecondsSnapshot: 60,
    challengesCountSnapshot: 2,
    timeLimitSecondsSnapshot: 600,
    startedAt: STARTED_AT,
    expiresAt: EXPIRES_AT,
    endedAt: null,
    challenges: [],
    ...overrides,
  };
}

/** Fake que replica a semântica do compare-and-set de expiração do adapter. */
class FakeSessionRepository implements GameSessionRepository {
  public state: GameSession | null;
  public expireCalls = 0;

  constructor(initial: GameSession | null) {
    this.state = initial;
  }

  create(): Promise<GameSession> {
    throw new Error('unexpected create');
  }
  startIfCreated(input: StartGameSessionInput): Promise<GameSession | null> {
    throw new Error(`unexpected startIfCreated(${input.sessionId})`);
  }
  findById(id: string): Promise<GameSession | null> {
    return Promise.resolve(
      this.state && this.state.id === id ? this.state : null,
    );
  }
  expireIfDue(input: ExpireGameSessionInput): Promise<GameSession | null> {
    this.expireCalls += 1;
    const s = this.state;
    if (
      s &&
      s.id === input.sessionId &&
      s.status === 'IN_PROGRESS' &&
      s.expiresAt !== null &&
      input.now.getTime() >= s.expiresAt.getTime()
    ) {
      this.state = { ...s, status: 'EXPIRED', endedAt: s.expiresAt };
      return Promise.resolve(this.state);
    }
    return Promise.resolve(null);
  }
}

describe('expireRoundIfDue', () => {
  it('lança GameSessionNotFoundError quando a rodada não existe', async () => {
    const repo = new FakeSessionRepository(null);
    await expect(
      expireRoundIfDue(
        { sessions: repo, clock: fixedClock(EXPIRES_AT) },
        { sessionId: 'missing' },
      ),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
  });

  it('antes do prazo (now < expiresAt) não expira', async () => {
    const repo = new FakeSessionRepository(session());
    const before = new Date(EXPIRES_AT.getTime() - 1);
    const result = await expireRoundIfDue(
      { sessions: repo, clock: fixedClock(before) },
      { sessionId: 'session-1' },
    );
    expect(result.expiredNow).toBe(false);
    expect(result.session.status).toBe('IN_PROGRESS');
    expect(result.session.endedAt).toBeNull();
  });

  it('exatamente no prazo (now == expiresAt) expira', async () => {
    const repo = new FakeSessionRepository(session());
    const result = await expireRoundIfDue(
      { sessions: repo, clock: fixedClock(EXPIRES_AT) },
      { sessionId: 'session-1' },
    );
    expect(result.expiredNow).toBe(true);
    expect(result.session.status).toBe('EXPIRED');
  });

  it('após o prazo (now > expiresAt) expira com endedAt = expiresAt', async () => {
    const repo = new FakeSessionRepository(session());
    const after = new Date(EXPIRES_AT.getTime() + 8000);
    const result = await expireRoundIfDue(
      { sessions: repo, clock: fixedClock(after) },
      { sessionId: 'session-1' },
    );
    expect(result.expiredNow).toBe(true);
    expect(result.session.endedAt).toEqual(EXPIRES_AT);
    // endedAt NUNCA é o relógio de detecção (after).
    expect(result.session.endedAt).not.toEqual(after);
  });

  it('é idempotente: segunda chamada preserva endedAt e não retransiciona', async () => {
    const repo = new FakeSessionRepository(session());
    const after = new Date(EXPIRES_AT.getTime() + 5000);
    const first = await expireRoundIfDue(
      { sessions: repo, clock: fixedClock(after) },
      { sessionId: 'session-1' },
    );
    expect(first.expiredNow).toBe(true);
    const callsAfterFirst = repo.expireCalls;

    const second = await expireRoundIfDue(
      { sessions: repo, clock: fixedClock(new Date(after.getTime() + 60000)) },
      { sessionId: 'session-1' },
    );
    expect(second.expiredNow).toBe(false);
    expect(second.session.status).toBe('EXPIRED');
    expect(second.session.endedAt).toEqual(EXPIRES_AT);
    // Já EXPIRED: nem tenta o compare-and-set novamente.
    expect(repo.expireCalls).toBe(callsAfterFirst);
  });

  it('sessão já EXPIRED preserva endedAt sem nova transição', async () => {
    const repo = new FakeSessionRepository(
      session({ status: 'EXPIRED', endedAt: EXPIRES_AT }),
    );
    const result = await expireRoundIfDue(
      {
        sessions: repo,
        clock: fixedClock(new Date(EXPIRES_AT.getTime() + 999)),
      },
      { sessionId: 'session-1' },
    );
    expect(result.expiredNow).toBe(false);
    expect(result.session.endedAt).toEqual(EXPIRES_AT);
    expect(repo.expireCalls).toBe(0);
  });

  it('não altera estados incompatíveis (CREATED, COMPLETED, CANCELLED)', async () => {
    const incompatible: GameSessionStatus[] = [
      'CREATED',
      'COMPLETED',
      'CANCELLED',
    ];
    for (const status of incompatible) {
      const repo = new FakeSessionRepository(
        session({ status, endedAt: null }),
      );
      const result = await expireRoundIfDue(
        {
          sessions: repo,
          clock: fixedClock(new Date(EXPIRES_AT.getTime() + 10000)),
        },
        { sessionId: 'session-1' },
      );
      expect(result.expiredNow).toBe(false);
      expect(result.session.status).toBe(status);
      expect(result.session.endedAt).toBeNull();
      expect(repo.expireCalls).toBe(0);
    }
  });

  it('o Clock é a autoridade temporal (mesma sessão, relógios distintos)', async () => {
    const justBefore = await expireRoundIfDue(
      {
        sessions: new FakeSessionRepository(session()),
        clock: fixedClock(new Date(EXPIRES_AT.getTime() - 1)),
      },
      { sessionId: 'session-1' },
    );
    const atBoundary = await expireRoundIfDue(
      {
        sessions: new FakeSessionRepository(session()),
        clock: fixedClock(EXPIRES_AT),
      },
      { sessionId: 'session-1' },
    );
    expect(justBefore.expiredNow).toBe(false);
    expect(atBoundary.expiredNow).toBe(true);
  });
});
