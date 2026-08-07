import { describe, expect, it } from 'vitest';
import { startRound } from '@/modules/round/application/start-round';
import type {
  ExpireGameSessionInput,
  GameSessionRepository,
  StartGameSessionInput,
} from '@/modules/round/application/ports';
import type {
  GameSession,
  GameSessionStatus,
} from '@/modules/round/domain/game-session';
import {
  GameSessionNotFoundError,
  InvalidGameSessionStateTransitionError,
} from '@/modules/round/domain/errors';
import { fixedClock } from '@/shared/clock/clock';

function session(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'session-1',
    playerId: 'player-1',
    configurationId: 'config-1',
    status: 'CREATED',
    pointsPerApprovalSnapshot: 10,
    uploadGraceSecondsSnapshot: 60,
    challengesCountSnapshot: 2,
    timeLimitSecondsSnapshot: 600,
    startedAt: null,
    expiresAt: null,
    endedAt: null,
    challenges: [],
    ...overrides,
  };
}

// Timestamps que um "concorrente vencedor" gravaria — usados para provar que a
// perdedora do compare-and-set NÃO os sobrescreve.
const RIVAL_STARTED_AT = new Date('2020-01-01T00:00:00.000Z');
const RIVAL_EXPIRES_AT = new Date('2020-01-01T00:10:00.000Z');

class FakeSessionRepository implements GameSessionRepository {
  public state: GameSession | null;
  public startCalls = 0;
  public readonly startInputs: StartGameSessionInput[] = [];
  private readonly lostRace: boolean;

  constructor(initial: GameSession | null, opts: { lostRace?: boolean } = {}) {
    this.state = initial;
    this.lostRace = opts.lostRace ?? false;
  }

  create(): Promise<GameSession> {
    throw new Error('unexpected create');
  }

  findById(id: string): Promise<GameSession | null> {
    return Promise.resolve(
      this.state && this.state.id === id ? this.state : null,
    );
  }

  startIfCreated(input: StartGameSessionInput): Promise<GameSession | null> {
    this.startCalls += 1;
    this.startInputs.push(input);

    if (this.lostRace) {
      // Concorrente venceu entre o findById e este compare-and-set: o estado já
      // é IN_PROGRESS (com OUTROS timestamps) e esta escrita não aplica.
      if (this.state && this.state.status === 'CREATED') {
        this.state = {
          ...this.state,
          status: 'IN_PROGRESS',
          startedAt: RIVAL_STARTED_AT,
          expiresAt: RIVAL_EXPIRES_AT,
        };
      }
      return Promise.resolve(null);
    }

    if (this.state?.status === 'CREATED' && this.state.id === input.sessionId) {
      this.state = {
        ...this.state,
        status: 'IN_PROGRESS',
        startedAt: input.startedAt,
        expiresAt: input.expiresAt,
      };
      return Promise.resolve(this.state);
    }
    return Promise.resolve(null);
  }

  expireIfDue(input: ExpireGameSessionInput): Promise<GameSession | null> {
    throw new Error(`unexpected expireIfDue(${input.sessionId})`);
  }
}

describe('startRound', () => {
  const now = new Date('2026-08-07T12:00:00.000Z');

  it('lança GameSessionNotFoundError quando a rodada não existe', async () => {
    const repo = new FakeSessionRepository(null);
    await expect(
      startRound(
        { sessions: repo, clock: fixedClock(now) },
        { sessionId: 'missing' },
      ),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
  });

  it('aplica a transição CREATED → IN_PROGRESS via compare-and-set', async () => {
    const repo = new FakeSessionRepository(session({ status: 'CREATED' }));
    const started = await startRound(
      { sessions: repo, clock: fixedClock(now) },
      { sessionId: 'session-1' },
    );
    expect(started.status).toBe('IN_PROGRESS');
    expect(repo.startCalls).toBe(1);
  });

  it('registra startedAt pelo relógio do servidor (Clock)', async () => {
    const repo = new FakeSessionRepository(session());
    const started = await startRound(
      { sessions: repo, clock: fixedClock(now) },
      { sessionId: 'session-1' },
    );
    expect(repo.startInputs[0]?.startedAt).toEqual(now);
    expect(started.startedAt).toEqual(now);
  });

  it('calcula expiresAt = startedAt + timeLimitSecondsSnapshot', async () => {
    const repo = new FakeSessionRepository(
      session({ timeLimitSecondsSnapshot: 300 }),
    );
    const started = await startRound(
      { sessions: repo, clock: fixedClock(now) },
      { sessionId: 'session-1' },
    );
    expect(started.expiresAt).toEqual(new Date('2026-08-07T12:05:00.000Z'));
  });

  it('rejeita estado incompatível sem tentar o compare-and-set', async () => {
    const invalid: GameSessionStatus[] = [
      'IN_PROGRESS',
      'COMPLETED',
      'EXPIRED',
      'CANCELLED',
    ];
    for (const status of invalid) {
      const repo = new FakeSessionRepository(session({ status }));
      await expect(
        startRound(
          { sessions: repo, clock: fixedClock(now) },
          { sessionId: 'session-1' },
        ),
      ).rejects.toBeInstanceOf(InvalidGameSessionStateTransitionError);
      expect(repo.startCalls).toBe(0);
    }
  });

  it('compare-and-set perdido: erro de transição e timestamps não sobrescritos', async () => {
    const repo = new FakeSessionRepository(session({ status: 'CREATED' }), {
      lostRace: true,
    });
    await expect(
      startRound(
        { sessions: repo, clock: fixedClock(now) },
        { sessionId: 'session-1' },
      ),
    ).rejects.toBeInstanceOf(InvalidGameSessionStateTransitionError);
    // A vencedora (concorrente) manteve seus timestamps; a perdedora não os tocou.
    expect(repo.state?.status).toBe('IN_PROGRESS');
    expect(repo.state?.startedAt).toEqual(RIVAL_STARTED_AT);
    expect(repo.state?.expiresAt).toEqual(RIVAL_EXPIRES_AT);
  });

  it('segunda chamada após o início não sobrescreve os timestamps', async () => {
    const repo = new FakeSessionRepository(session({ status: 'CREATED' }));
    const first = await startRound(
      { sessions: repo, clock: fixedClock(now) },
      { sessionId: 'session-1' },
    );
    const later = new Date('2026-08-07T13:00:00.000Z');
    await expect(
      startRound(
        { sessions: repo, clock: fixedClock(later) },
        { sessionId: 'session-1' },
      ),
    ).rejects.toBeInstanceOf(InvalidGameSessionStateTransitionError);
    expect(repo.state?.startedAt).toEqual(first.startedAt);
    expect(repo.state?.expiresAt).toEqual(first.expiresAt);
  });
});
