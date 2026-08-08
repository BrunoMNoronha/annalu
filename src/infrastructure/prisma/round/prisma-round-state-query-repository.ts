import type { PrismaClient } from '@prisma/client';
import type {
  RoundStateProjection,
  RoundStateQueryRepository,
} from '@/modules/round';

/**
 * Adapter Prisma do `RoundStateQueryRepository` (somente leitura).
 *
 * **Minimização de dados no `select`:** carrega apenas os campos da sessão e, de
 * cada `SessionChallenge`, `id`/`position`/`state` + `Riddle.prompt`. NUNCA
 * seleciona `Word`, `Word.text`, `AcceptedAnswer` (`text`/`normalizedText`) nem
 * PII do jogador/responsável — a solução da charada jamais chega ao cliente. A
 * projeção respeita os desafios persistidos (sem reexecutar sorteio nem filtrar
 * por status atual do catálogo); desativar palavra/charada depois **não** remove
 * o desafio da rodada já criada.
 */
export class PrismaRoundStateQueryRepository implements RoundStateQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadRoundState(
    sessionId: string,
  ): Promise<RoundStateProjection | null> {
    const row = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        endedAt: true,
        sessionChallenges: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            state: true,
            // Apenas o enunciado — NUNCA word/acceptedAnswers.
            riddle: { select: { prompt: true } },
            // Rascunho para restauração — só id/texto/estado (sem imagem/avaliação).
            playerAnswer: {
              select: { id: true, answerText: true, state: true },
            },
          },
        },
      },
    });
    if (!row) {
      return null;
    }
    return {
      sessionId: row.id,
      status: row.status,
      startedAt: row.startedAt,
      expiresAt: row.expiresAt,
      endedAt: row.endedAt,
      challenges: row.sessionChallenges.map((challenge) => ({
        challengeId: challenge.id,
        position: challenge.position,
        state: challenge.state,
        prompt: challenge.riddle.prompt,
        answer: challenge.playerAnswer
          ? {
              answerId: challenge.playerAnswer.id,
              answerText: challenge.playerAnswer.answerText,
              state: challenge.playerAnswer.state,
            }
          : null,
      })),
    };
  }
}
