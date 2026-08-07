import { describe, expect, it } from 'vitest';
import { startRound } from '@/modules/round/application/start-round';
import type {
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
    challenges: [],
    ...overrides,
  };
}

class FakeSessionRepository implements GameSessionRepository {
  public readonly startInputs: StartGameSessionInput[] = [];
  constructor(private readonly stored: GameSession | null) {}

  create(): Promise<GameSession> {
    throw new Error('unexpected create');
  }
  findById(id: string): Promise<GameSession | null> {
    return Promise.resolve(
      this.stored && this.stored.id === id ? this.stored : null,
    );
  }
  start(input: StartGameSessionInput): Promise<GameSession> {
    this.startInputs.push(input);
    return Promise.resolve(
      session({
        ...(this.stored ?? {}),
        status: 'IN_PROGRESS',
        startedAt: input.startedAt,
        expiresAt: input.expiresAt,
      }),
    );
  }
}

describe('startRound', () => {
  const now = new Date('2026-08-07T12:00:00.000Z');

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
    await startRound(
      { sessions: repo, clock: fixedClock(now) },
      { sessionId: 'session-1' },
    );
    expect(repo.startInputs[0]?.expiresAt).toEqual(
      new Date('2026-08-07T12:05:00.000Z'),
    );
  });

  it('realiza a transição válida CREATED → IN_PROGRESS', async () => {
    const repo = new FakeSessionRepository(session({ status: 'CREATED' }));
    const started = await startRound(
      { sessions: repo, clock: fixedClock(now) },
      { sessionId: 'session-1' },
    );
    expect(started.status).toBe('IN_PROGRESS');
  });

  it('rejeita transição inválida a partir de estado não-CREATED e não persiste', async () => {
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
      expect(repo.startInputs).toHaveLength(0);
    }
  });

  it('lança GameSessionNotFoundError quando a rodada não existe', async () => {
    const repo = new FakeSessionRepository(null);
    await expect(
      startRound(
        { sessions: repo, clock: fixedClock(now) },
        { sessionId: 'missing' },
      ),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
  });
});
