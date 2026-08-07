import type { PrismaClient } from '@prisma/client';
import type { ContentCatalogRepository } from '@/modules/content/application/ports';
import type { ActiveContent } from '@/modules/content/domain/active-content';

/**
 * Adapter Prisma do `ContentCatalogRepository`. Retorna palavras ativas com
 * charadas ativas e respostas aceitas — base elegível para a futura rodada.
 */
export class PrismaContentCatalogRepository implements ContentCatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listActiveContent(): Promise<ActiveContent[]> {
    const words = await this.prisma.word.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      include: {
        riddles: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
          include: { acceptedAnswers: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    return words.map((word) => ({
      word: {
        id: word.id,
        text: word.text,
        status: word.status,
        createdByAdminUserId: word.createdByAdminUserId,
      },
      riddles: word.riddles.map((riddle) => ({
        riddle: {
          id: riddle.id,
          wordId: riddle.wordId,
          prompt: riddle.prompt,
          status: riddle.status,
        },
        acceptedAnswers: riddle.acceptedAnswers.map((answer) => ({
          id: answer.id,
          riddleId: answer.riddleId,
          text: answer.text,
          normalizedText: answer.normalizedText,
        })),
      })),
    }));
  }
}
