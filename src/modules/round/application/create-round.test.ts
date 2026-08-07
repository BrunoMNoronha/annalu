import { describe, expect, it } from 'vitest';
import type {
  ActiveContent,
  ContentCatalogRepository,
  CurrentGameConfiguration,
  GameConfigurationRepository,
} from '@/modules/content';
import { createRound } from '@/modules/round/application/create-round';
import type {
  CreateGameSessionInput,
  GameSessionRepository,
  StartGameSessionInput,
} from '@/modules/round/application/ports';
import type { GameSession } from '@/modules/round/domain/game-session';
import {
  InsufficientActiveContentError,
  NoCurrentConfigurationError,
} from '@/modules/round/domain/errors';
import { sequenceRandom } from '@/shared/random/random-source';

function configuration(
  overrides: Partial<CurrentGameConfiguration> = {},
): CurrentGameConfiguration {
  return {
    id: 'config-1',
    pointsPerApproval: 10,
    uploadGraceSeconds: 60,
    challengesPerRound: 2,
    timeLimitSeconds: 600,
    isCurrent: true,
    ...overrides,
  };
}

/** Constrói um acervo ativo com N charadas elegíveis (com resposta) + extras. */
function activeContent(
  eligibleIds: readonly string[],
  ineligibleIds: readonly string[] = [],
): ActiveContent[] {
  const riddle = (id: string, answers: number) => ({
    riddle: {
      id,
      wordId: 'word-1',
      prompt: `p-${id}`,
      status: 'ACTIVE' as const,
    },
    acceptedAnswers: Array.from({ length: answers }, (_, i) => ({
      id: `${id}-a${i}`,
      riddleId: id,
      text: `t${i}`,
      normalizedText: `t${i}`,
    })),
  });
  return [
    {
      word: {
        id: 'word-1',
        text: 'copo',
        status: 'ACTIVE',
        createdByAdminUserId: 'admin-1',
      },
      riddles: [
        ...eligibleIds.map((id) => riddle(id, 1)),
        ...ineligibleIds.map((id) => riddle(id, 0)),
      ],
    },
  ];
}

class FakeConfigRepository implements GameConfigurationRepository {
  constructor(private readonly value: CurrentGameConfiguration | null) {}
  getCurrent(): Promise<CurrentGameConfiguration | null> {
    return Promise.resolve(this.value);
  }
}

class FakeCatalogRepository implements ContentCatalogRepository {
  constructor(private readonly value: ActiveContent[]) {}
  listActiveContent(): Promise<ActiveContent[]> {
    return Promise.resolve(this.value);
  }
}

class FakeSessionRepository implements GameSessionRepository {
  public readonly createInputs: CreateGameSessionInput[] = [];
  create(input: CreateGameSessionInput): Promise<GameSession> {
    this.createInputs.push(input);
    return Promise.resolve({
      id: 'session-1',
      playerId: input.playerId,
      configurationId: input.configurationId,
      status: 'CREATED',
      pointsPerApprovalSnapshot: input.pointsPerApprovalSnapshot,
      uploadGraceSecondsSnapshot: input.uploadGraceSecondsSnapshot,
      challengesCountSnapshot: input.challengesCountSnapshot,
      timeLimitSecondsSnapshot: input.timeLimitSecondsSnapshot,
      startedAt: null,
      expiresAt: null,
      challenges: input.challenges.map((c, i) => ({
        id: `challenge-${i}`,
        riddleId: c.riddleId,
        position: c.position,
        state: 'PENDING',
      })),
    });
  }
  findById(): Promise<GameSession | null> {
    return Promise.resolve(null);
  }
  start(input: StartGameSessionInput): Promise<GameSession> {
    throw new Error(`unexpected start(${input.sessionId})`);
  }
}

function deps(
  config: CurrentGameConfiguration | null,
  active: ActiveContent[],
  random = sequenceRandom([0]),
): {
  configurations: FakeConfigRepository;
  catalog: FakeCatalogRepository;
  sessions: FakeSessionRepository;
  random: ReturnType<typeof sequenceRandom>;
} {
  return {
    configurations: new FakeConfigRepository(config),
    catalog: new FakeCatalogRepository(active),
    sessions: new FakeSessionRepository(),
    random,
  };
}

describe('createRound', () => {
  it('usa a configuração vigente e persiste a rodada', async () => {
    const d = deps(configuration(), activeContent(['r1', 'r2', 'r3']));
    const session = await createRound(d, { playerId: 'player-1' });
    expect(session.status).toBe('CREATED');
    expect(session.playerId).toBe('player-1');
    expect(d.sessions.createInputs[0]?.configurationId).toBe('config-1');
  });

  it('sem configuração vigente lança erro e não persiste', async () => {
    const d = deps(null, activeContent(['r1', 'r2', 'r3']));
    await expect(
      createRound(d, { playerId: 'player-1' }),
    ).rejects.toBeInstanceOf(NoCurrentConfigurationError);
    expect(d.sessions.createInputs).toHaveLength(0);
  });

  it('seleciona a quantidade de desafios definida na configuração', async () => {
    const d = deps(
      configuration({ challengesPerRound: 3 }),
      activeContent(['r1', 'r2', 'r3', 'r4', 'r5']),
    );
    const session = await createRound(d, { playerId: 'player-1' });
    expect(session.challenges).toHaveLength(3);
    expect(d.sessions.createInputs[0]?.challenges).toHaveLength(3);
  });

  it('copia exatamente os snapshots da configuração vigente', async () => {
    const d = deps(
      configuration({
        pointsPerApproval: 15,
        uploadGraceSeconds: 45,
        challengesPerRound: 2,
        timeLimitSeconds: 300,
      }),
      activeContent(['r1', 'r2', 'r3']),
    );
    await createRound(d, { playerId: 'player-1' });
    const input = d.sessions.createInputs[0];
    expect(input).toMatchObject({
      pointsPerApprovalSnapshot: 15,
      uploadGraceSecondsSnapshot: 45,
      challengesCountSnapshot: 2,
      timeLimitSecondsSnapshot: 300,
    });
  });

  it('seleciona apenas conteúdo elegível (ignora charada sem resposta aceita)', async () => {
    const d = deps(
      configuration({ challengesPerRound: 1 }),
      activeContent(['r-com-resposta'], ['r-sem-resposta']),
    );
    const session = await createRound(d, { playerId: 'player-1' });
    expect(session.challenges.map((c) => c.riddleId)).toEqual([
      'r-com-resposta',
    ]);
  });

  it('é determinística com fonte de aleatoriedade controlada', async () => {
    const d = deps(
      configuration({ challengesPerRound: 2 }),
      activeContent(['r1', 'r2', 'r3', 'r4']),
      sequenceRandom([0]),
    );
    const session = await createRound(d, { playerId: 'player-1' });
    expect(session.challenges).toEqual([
      { id: 'challenge-0', riddleId: 'r2', position: 1, state: 'PENDING' },
      { id: 'challenge-1', riddleId: 'r3', position: 2, state: 'PENDING' },
    ]);
  });

  it('não repete charadas dentro da rodada', async () => {
    const d = deps(
      configuration({ challengesPerRound: 4 }),
      activeContent(['r1', 'r2', 'r3', 'r4', 'r5']),
      sequenceRandom([0.2, 0.7, 0.4, 0.9, 0.1]),
    );
    const session = await createRound(d, { playerId: 'player-1' });
    const ids = session.challenges.map((c) => c.riddleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('acervo insuficiente lança erro provisório e não persiste (RN-SEL-003 HIPÓTESE)', async () => {
    const d = deps(
      configuration({ challengesPerRound: 3 }),
      activeContent(['r1', 'r2']),
    );
    await expect(
      createRound(d, { playerId: 'player-1' }),
    ).rejects.toBeInstanceOf(InsufficientActiveContentError);
    expect(d.sessions.createInputs).toHaveLength(0);
  });
});
