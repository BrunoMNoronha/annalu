import { describe, expect, it } from 'vitest';
import { getRoundState } from '@/modules/round/application/get-round-state';
import type {
  CreateGameSessionInput,
  ExpireGameSessionInput,
  GameSessionRepository,
  StartGameSessionInput,
} from '@/modules/round/application/ports';
import type {
  RoundStateChallengeView,
  RoundStateProjection,
  RoundStateQueryRepository,
} from '@/modules/round/application/round-state-ports';
import type {
  GameSession,
  GameSessionStatus,
} from '@/modules/round/domain/game-session';
import { GameSessionNotFoundError } from '@/modules/round/domain/errors';
import type { Clock } from '@/shared/clock/clock';

const STARTED_AT = new Date('2026-08-07T12:00:00.000Z');
const EXPIRES_AT = new Date('2026-08-07T12:10:00.000Z');

function challengeViews(): RoundStateChallengeView[] {
  return [
    {
      challengeId: 'c-1',
      position: 1,
      state: 'PENDING',
      prompt: 'O que é?',
      answer: null,
    },
    {
      challengeId: 'c-2',
      position: 2,
      state: 'PENDING',
      prompt: 'Adivinhe',
      answer: { answerId: 'a-2', answerText: '', state: 'DRAFT' },
    },
    {
      challengeId: 'c-3',
      position: 3,
      state: 'PENDING',
      prompt: 'Qual?',
      answer: { answerId: 'a-3', answerText: ' Bola ', state: 'DRAFT' },
    },
  ];
}

function gameSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'session-1',
    playerId: 'player-1',
    configurationId: 'config-1',
    status: 'IN_PROGRESS',
    pointsPerApprovalSnapshot: 10,
    uploadGraceSecondsSnapshot: 60,
    challengesCountSnapshot: 3,
    timeLimitSecondsSnapshot: 600,
    startedAt: STARTED_AT,
    expiresAt: EXPIRES_AT,
    endedAt: null,
    challenges: [],
    ...overrides,
  };
}

/**
 * Store combinado: implementa o port de escrita (para a expiração sob demanda) e
 * o port de leitura (projeção) sobre o MESMO estado mutável — a projeção reflete
 * a transição aplicada pela expiração.
 */
class FakeStore implements GameSessionRepository, RoundStateQueryRepository {
  public session: GameSession | null;
  public readonly views: RoundStateChallengeView[];
  public expireCalls = 0;
  public lastExpireNow: Date | null = null;

  constructor(
    session: GameSession | null,
    views: RoundStateChallengeView[] = challengeViews(),
  ) {
    this.session = session;
    this.views = views;
  }

  create(input: CreateGameSessionInput): Promise<GameSession> {
    throw new Error(`unexpected create(${input.playerId})`);
  }
  startIfCreated(input: StartGameSessionInput): Promise<GameSession | null> {
    throw new Error(`unexpected startIfCreated(${input.sessionId})`);
  }
  findById(id: string): Promise<GameSession | null> {
    return Promise.resolve(
      this.session && this.session.id === id ? this.session : null,
    );
  }
  expireIfDue(input: ExpireGameSessionInput): Promise<GameSession | null> {
    this.expireCalls += 1;
    this.lastExpireNow = input.now;
    const s = this.session;
    if (
      s &&
      s.id === input.sessionId &&
      s.status === 'IN_PROGRESS' &&
      s.expiresAt !== null &&
      input.now.getTime() >= s.expiresAt.getTime()
    ) {
      this.session = { ...s, status: 'EXPIRED', endedAt: s.expiresAt };
      return Promise.resolve(this.session);
    }
    return Promise.resolve(null);
  }

  loadRoundState(sessionId: string): Promise<RoundStateProjection | null> {
    const s = this.session;
    if (!s || s.id !== sessionId) {
      return Promise.resolve(null);
    }
    return Promise.resolve({
      sessionId: s.id,
      status: s.status,
      startedAt: s.startedAt,
      expiresAt: s.expiresAt,
      endedAt: s.endedAt,
      challenges: this.views,
    });
  }
}

function countingClock(now: Date): { clock: Clock; calls: () => number } {
  let calls = 0;
  return {
    clock: {
      now: () => {
        calls += 1;
        return now;
      },
    },
    calls: () => calls,
  };
}

describe('getRoundState', () => {
  it('1. sessão inexistente → GameSessionNotFoundError', async () => {
    const store = new FakeStore(null);
    await expect(
      getRoundState(
        {
          sessions: store,
          roundStates: store,
          clock: countingClock(STARTED_AT).clock,
        },
        { sessionId: 'missing' },
      ),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
  });

  it('2. CREATED → remainingMilliseconds = null', async () => {
    const store = new FakeStore(
      gameSession({ status: 'CREATED', startedAt: null, expiresAt: null }),
    );
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(STARTED_AT).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(result.status).toBe('CREATED');
    expect(result.remainingMilliseconds).toBeNull();
    // Consulta não inicia a sessão.
    expect(store.session?.status).toBe('CREATED');
  });

  it('3/4. IN_PROGRESS antes do prazo permanece IN_PROGRESS com remaining exato', async () => {
    const now = new Date(EXPIRES_AT.getTime() - 5000);
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      { sessions: store, roundStates: store, clock: countingClock(now).clock },
      { sessionId: 'session-1' },
    );
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.remainingMilliseconds).toBe(5000);
  });

  it('5. serverNow deriva do Clock', async () => {
    const now = new Date(EXPIRES_AT.getTime() - 1000);
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      { sessions: store, roundStates: store, clock: countingClock(now).clock },
      { sessionId: 'session-1' },
    );
    expect(result.serverNow).toEqual(now);
  });

  it('6. boundary serverNow == expiresAt → EXPIRED, remaining 0', async () => {
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(EXPIRES_AT).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(result.status).toBe('EXPIRED');
    expect(result.remainingMilliseconds).toBe(0);
    expect(result.endedAt).toEqual(EXPIRES_AT);
  });

  it('7. após o prazo → EXPIRED', async () => {
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(new Date(EXPIRES_AT.getTime() + 9000)).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(result.status).toBe('EXPIRED');
    expect(result.remainingMilliseconds).toBe(0);
    // endedAt = expiresAt (nunca o relógio de detecção).
    expect(result.endedAt).toEqual(EXPIRES_AT);
  });

  it('8. já EXPIRED → remaining 0 sem nova transição', async () => {
    const store = new FakeStore(
      gameSession({ status: 'EXPIRED', endedAt: EXPIRES_AT }),
    );
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(new Date(EXPIRES_AT.getTime() + 60000)).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(result.status).toBe('EXPIRED');
    expect(result.remainingMilliseconds).toBe(0);
    expect(store.expireCalls).toBe(0);
  });

  it('9. COMPLETED → remaining null', async () => {
    const store = new FakeStore(gameSession({ status: 'COMPLETED' }));
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(EXPIRES_AT).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(result.status).toBe('COMPLETED');
    expect(result.remainingMilliseconds).toBeNull();
    expect(store.expireCalls).toBe(0);
  });

  it('10. CANCELLED → remaining null', async () => {
    const store = new FakeStore(gameSession({ status: 'CANCELLED' }));
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(EXPIRES_AT).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(result.status).toBe('CANCELLED');
    expect(result.remainingMilliseconds).toBeNull();
    expect(store.expireCalls).toBe(0);
  });

  it('11. desafios ordenados por posição e com totalChallenges', async () => {
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(new Date(EXPIRES_AT.getTime() - 1)).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(result.totalChallenges).toBe(3);
    expect(result.challenges.map((c) => c.position)).toEqual([1, 2, 3]);
  });

  it('12/13. read model não contém palavra-alvo nem respostas aceitas', async () => {
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(new Date(EXPIRES_AT.getTime() - 1)).clock,
      },
      { sessionId: 'session-1' },
    );
    const forbidden = [
      'word',
      'wordText',
      'acceptedAnswers',
      'normalizedText',
      'accessCodeHash',
      'guardian',
    ];
    for (const challenge of result.challenges) {
      expect(Object.keys(challenge).sort()).toEqual([
        'answer',
        'challengeId',
        'position',
        'prompt',
        'state',
      ]);
      for (const key of forbidden) {
        expect(challenge).not.toHaveProperty(key);
      }
    }
    for (const key of [...forbidden, 'playerId', 'configurationId']) {
      expect(result).not.toHaveProperty(key);
    }
  });

  it('23/24/25. readback do rascunho: null vs DRAFT vazio vs texto literal', async () => {
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      {
        sessions: store,
        roundStates: store,
        clock: countingClock(new Date(EXPIRES_AT.getTime() - 1)).clock,
      },
      { sessionId: 'session-1' },
    );
    // c-1 sem resposta → null; c-2 DRAFT vazio → ""; c-3 DRAFT com texto literal.
    expect(result.challenges[0]?.answer).toBeNull();
    expect(result.challenges[1]?.answer).toEqual({
      answerId: 'a-2',
      answerText: '',
      state: 'DRAFT',
    });
    expect(result.challenges[2]?.answer?.answerText).toBe(' Bola ');
    // Ausência de resposta é distinta de DRAFT vazio.
    expect(result.challenges[0]?.answer).toBeNull();
    expect(result.challenges[1]?.answer).not.toBeNull();
  });

  it('15. uma única referência temporal autoritativa por consulta', async () => {
    const now = EXPIRES_AT;
    const { clock, calls } = countingClock(now);
    const store = new FakeStore(gameSession());
    const result = await getRoundState(
      { sessions: store, roundStates: store, clock },
      { sessionId: 'session-1' },
    );
    // O Clock é consultado exatamente uma vez; o MESMO now orienta expiração,
    // serverNow e o tempo restante.
    expect(calls()).toBe(1);
    expect(result.serverNow).toEqual(now);
    expect(store.lastExpireNow).toEqual(now);
  });

  it('16. expiração é delegada ao compare-and-set (não reimplementada)', async () => {
    // IN_PROGRESS não vencida: a regra é avaliada pelo CAS (expireIfDue chamado),
    // que retorna null — o estado permanece IN_PROGRESS.
    const notDue = new FakeStore(gameSession());
    const r1 = await getRoundState(
      {
        sessions: notDue,
        roundStates: notDue,
        clock: countingClock(new Date(EXPIRES_AT.getTime() - 1)).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(notDue.expireCalls).toBe(1);
    expect(r1.status).toBe('IN_PROGRESS');

    // IN_PROGRESS vencida: o mesmo CAS aplica a transição.
    const due = new FakeStore(gameSession());
    const r2 = await getRoundState(
      {
        sessions: due,
        roundStates: due,
        clock: countingClock(EXPIRES_AT).clock,
      },
      { sessionId: 'session-1' },
    );
    expect(due.expireCalls).toBe(1);
    expect(r2.status).toBe('EXPIRED');
  });
});
