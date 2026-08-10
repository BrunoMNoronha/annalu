import { describe, expect, it } from 'vitest';
import { saveAnswerDraft } from '@/modules/round/application/save-answer-draft';
import type {
  CreateGameSessionInput,
  ExpireGameSessionInput,
  GameSessionRepository,
  StartGameSessionInput,
} from '@/modules/round/application/ports';
import type {
  PlayerAnswerDraftRepository,
  SaveAnswerDraftInput,
} from '@/modules/round/application/player-answer-ports';
import type {
  GameSession,
  GameSessionStatus,
} from '@/modules/round/domain/game-session';
import type { PlayerAnswer } from '@/modules/round/domain/player-answer';
import type { PlayerAnswerState } from '@/modules/round/domain/player-answer-state';
import {
  GameSessionNotEditableError,
  GameSessionNotFoundError,
  PlayerAnswerNotDraftError,
  SessionChallengeMismatchError,
  SessionChallengeNotFoundError,
} from '@/modules/round/domain/errors';
import type { Clock } from '@/shared/clock/clock';

const EXPIRES_AT = new Date('2026-08-07T12:10:00.000Z');
const CHALLENGE_ID = 'challenge-1';

function gameSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'session-1',
    playerId: 'player-1',
    configurationId: 'config-1',
    status: 'IN_PROGRESS',
    pointsPerApprovalSnapshot: 10,
    uploadGraceSecondsSnapshot: 60,
    challengesCountSnapshot: 1,
    timeLimitSecondsSnapshot: 600,
    startedAt: new Date('2026-08-07T12:00:00.000Z'),
    expiresAt: EXPIRES_AT,
    endedAt: null,
    challenges: [
      { id: CHALLENGE_ID, riddleId: 'r-1', position: 1, state: 'PENDING' },
    ],
    ...overrides,
  };
}

class FakeSessions implements GameSessionRepository {
  public session: GameSession | null;
  constructor(session: GameSession | null) {
    this.session = session;
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
}

/** Fake do repositório atômico: replica o contrato observável do adapter. */
class FakePlayerAnswers implements PlayerAnswerDraftRepository {
  public readonly inputs: SaveAnswerDraftInput[] = [];
  private readonly store = new Map<
    string,
    { id: string; answerText: string; state: PlayerAnswerState }
  >();

  constructor(
    private readonly known: Map<string, string>,
    seed?: {
      challengeId: string;
      state: PlayerAnswerState;
      answerText?: string;
    },
  ) {
    if (seed) {
      this.store.set(seed.challengeId, {
        id: 'existing-answer',
        answerText: seed.answerText ?? '',
        state: seed.state,
      });
    }
  }

  saveDraft(input: SaveAnswerDraftInput): Promise<PlayerAnswer> {
    this.inputs.push(input);
    const owner = this.known.get(input.challengeId);
    if (owner === undefined) {
      throw new SessionChallengeNotFoundError(input.challengeId);
    }
    if (owner !== input.sessionId) {
      throw new SessionChallengeMismatchError();
    }
    const existing = this.store.get(input.challengeId);
    if (existing && existing.state !== 'DRAFT') {
      throw new PlayerAnswerNotDraftError(existing.state);
    }
    if (existing) {
      existing.answerText = input.answerText;
      return Promise.resolve({
        id: existing.id,
        sessionChallengeId: input.challengeId,
        answerText: existing.answerText,
        state: 'DRAFT',
        submittedAt: null,
      });
    }
    const created = {
      id: `answer-${this.store.size + 1}`,
      answerText: input.answerText,
      state: 'DRAFT' as const,
    };
    this.store.set(input.challengeId, created);
    return Promise.resolve({
      id: created.id,
      sessionChallengeId: input.challengeId,
      answerText: created.answerText,
      state: 'DRAFT',
      submittedAt: null,
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

function ownership(): Map<string, string> {
  return new Map([[CHALLENGE_ID, 'session-1']]);
}

const beforeDeadline = new Date(EXPIRES_AT.getTime() - 1000);

function deps(
  session: GameSession | null,
  answers: FakePlayerAnswers,
  now: Date = beforeDeadline,
) {
  const sessions = new FakeSessions(session);
  const { clock, calls } = countingClock(now);
  return { sessions, playerAnswers: answers, clock, calls };
}

describe('saveAnswerDraft', () => {
  it('1. sessão inexistente → GameSessionNotFoundError, sem gravar', async () => {
    const answers = new FakePlayerAnswers(ownership());
    const d = deps(null, answers);
    await expect(
      saveAnswerDraft(d, {
        sessionId: 'missing',
        challengeId: CHALLENGE_ID,
        answerText: 'x',
      }),
    ).rejects.toBeInstanceOf(GameSessionNotFoundError);
    expect(answers.inputs).toHaveLength(0);
  });

  it('2. challenge inexistente → SessionChallengeNotFoundError', async () => {
    const answers = new FakePlayerAnswers(new Map());
    const d = deps(gameSession(), answers);
    await expect(
      saveAnswerDraft(d, {
        sessionId: 'session-1',
        challengeId: 'ghost',
        answerText: 'x',
      }),
    ).rejects.toBeInstanceOf(SessionChallengeNotFoundError);
  });

  it('3. challenge de outra sessão → SessionChallengeMismatchError', async () => {
    const answers = new FakePlayerAnswers(new Map([[CHALLENGE_ID, 'outra']]));
    const d = deps(gameSession(), answers);
    await expect(
      saveAnswerDraft(d, {
        sessionId: 'session-1',
        challengeId: CHALLENGE_ID,
        answerText: 'x',
      }),
    ).rejects.toBeInstanceOf(SessionChallengeMismatchError);
  });

  it('4. primeira gravação cria DRAFT com submittedAt null', async () => {
    const answers = new FakePlayerAnswers(ownership());
    const d = deps(gameSession(), answers);
    const answer = await saveAnswerDraft(d, {
      sessionId: 'session-1',
      challengeId: CHALLENGE_ID,
      answerText: 'olá',
    });
    expect(answer.state).toBe('DRAFT');
    expect(answer.submittedAt).toBeNull();
    expect(answer.sessionChallengeId).toBe(CHALLENGE_ID);
  });

  it('5. atualização preserva o mesmo PlayerAnswer (mesmo id)', async () => {
    const answers = new FakePlayerAnswers(ownership());
    const d = deps(gameSession(), answers);
    const first = await saveAnswerDraft(d, {
      sessionId: 'session-1',
      challengeId: CHALLENGE_ID,
      answerText: 'a',
    });
    const second = await saveAnswerDraft(d, {
      sessionId: 'session-1',
      challengeId: CHALLENGE_ID,
      answerText: 'b',
    });
    expect(second.id).toBe(first.id);
    expect(second.answerText).toBe('b');
  });

  it('6-9. preserva texto literalmente (incorreto, caixa, acento, espaços)', async () => {
    const literals = ['resposta errada', 'BÓLA', 'Maçã', ' Bola '];
    for (const text of literals) {
      const answers = new FakePlayerAnswers(ownership());
      const d = deps(gameSession(), answers);
      const answer = await saveAnswerDraft(d, {
        sessionId: 'session-1',
        challengeId: CHALLENGE_ID,
        answerText: text,
      });
      // A aplicação encaminha e devolve o texto exatamente como recebido.
      expect(answers.inputs[0]?.answerText).toBe(text);
      expect(answer.answerText).toBe(text);
    }
  });

  it('10/11. string vazia é válida e nada é normalizado/consultado como correção', async () => {
    const answers = new FakePlayerAnswers(ownership(), {
      challengeId: CHALLENGE_ID,
      state: 'DRAFT',
      answerText: 'tinha texto',
    });
    const d = deps(gameSession(), answers);
    const answer = await saveAnswerDraft(d, {
      sessionId: 'session-1',
      challengeId: CHALLENGE_ID,
      answerText: '',
    });
    expect(answer.answerText).toBe('');
    // Encaminhado literal (sem trim/normalização/lookup de AcceptedAnswer).
    expect(answers.inputs[0]?.answerText).toBe('');
  });

  it('12-15. estados não editáveis rejeitam sem gravar', async () => {
    const statuses: GameSessionStatus[] = [
      'CREATED',
      'EXPIRED',
      'COMPLETED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      const answers = new FakePlayerAnswers(ownership());
      const d = deps(gameSession({ status }), answers);
      await expect(
        saveAnswerDraft(d, {
          sessionId: 'session-1',
          challengeId: CHALLENGE_ID,
          answerText: 'x',
        }),
      ).rejects.toBeInstanceOf(GameSessionNotEditableError);
      expect(answers.inputs).toHaveLength(0);
    }
  });

  it('16. antes do prazo aceita', async () => {
    const answers = new FakePlayerAnswers(ownership());
    const d = deps(gameSession(), answers, beforeDeadline);
    const answer = await saveAnswerDraft(d, {
      sessionId: 'session-1',
      challengeId: CHALLENGE_ID,
      answerText: 'ok',
    });
    expect(answer.answerText).toBe('ok');
  });

  it('17/18. no prazo e após o prazo rejeitam, aplicam expiração e não gravam', async () => {
    for (const now of [EXPIRES_AT, new Date(EXPIRES_AT.getTime() + 5000)]) {
      const answers = new FakePlayerAnswers(ownership());
      const d = deps(gameSession(), answers, now);
      await expect(
        saveAnswerDraft(d, {
          sessionId: 'session-1',
          challengeId: CHALLENGE_ID,
          answerText: 'x',
        }),
      ).rejects.toBeInstanceOf(GameSessionNotEditableError);
      expect(answers.inputs).toHaveLength(0);
      // Estado observável coerente como EXPIRED (expiração aplicada).
      expect(d.sessions.session?.status).toBe('EXPIRED');
      expect(d.sessions.session?.endedAt).toEqual(EXPIRES_AT);
    }
  });

  it('19. Clock é consultado exatamente uma vez', async () => {
    const answers = new FakePlayerAnswers(ownership());
    const d = deps(gameSession(), answers);
    await saveAnswerDraft(d, {
      sessionId: 'session-1',
      challengeId: CHALLENGE_ID,
      answerText: 'ok',
    });
    expect(d.calls()).toBe(1);
    // O mesmo now foi encaminhado à gravação.
    expect(answers.inputs[0]?.now.getTime()).toBe(beforeDeadline.getTime());
  });

  it('20. resposta existente não-DRAFT é rejeitada', async () => {
    const answers = new FakePlayerAnswers(ownership(), {
      challengeId: CHALLENGE_ID,
      state: 'SUBMITTED',
    });
    const d = deps(gameSession(), answers);
    await expect(
      saveAnswerDraft(d, {
        sessionId: 'session-1',
        challengeId: CHALLENGE_ID,
        answerText: 'x',
      }),
    ).rejects.toBeInstanceOf(PlayerAnswerNotDraftError);
  });

  it('21. gravar rascunho não altera o SessionChallenge.state', async () => {
    const answers = new FakePlayerAnswers(ownership());
    const session = gameSession();
    const d = deps(session, answers);
    await saveAnswerDraft(d, {
      sessionId: 'session-1',
      challengeId: CHALLENGE_ID,
      answerText: 'ok',
    });
    expect(d.sessions.session?.challenges[0]?.state).toBe('PENDING');
  });
});
