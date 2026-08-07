import { Prisma, type PrismaClient } from '@prisma/client';
import type { AcceptedAnswerRepository } from '@/modules/content/application/ports';
import type { AcceptedAnswer } from '@/modules/content/domain/accepted-answer';
import {
  DuplicateAcceptedAnswerError,
  RiddleNotFoundError,
} from '@/modules/content/domain/errors';

interface AcceptedAnswerRow {
  id: string;
  riddleId: string;
  text: string;
  normalizedText: string;
}

function toAnswer(row: AcceptedAnswerRow): AcceptedAnswer {
  return {
    id: row.id,
    riddleId: row.riddleId,
    text: row.text,
    normalizedText: row.normalizedText,
  };
}

/** Adapter Prisma do `AcceptedAnswerRepository`. */
export class PrismaAcceptedAnswerRepository implements AcceptedAnswerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    riddleId: string;
    text: string;
    normalizedText: string;
  }): Promise<AcceptedAnswer> {
    try {
      const row = await this.prisma.acceptedAnswer.create({
        data: {
          riddleId: input.riddleId,
          text: input.text,
          normalizedText: input.normalizedText,
        },
      });
      return toAnswer(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unicidade (riddle_id, normalized_text) — garantia final do banco.
        if (error.code === 'P2002') {
          throw new DuplicateAcceptedAnswerError();
        }
        // FK inexistente para a charada.
        if (error.code === 'P2003') {
          throw new RiddleNotFoundError(input.riddleId);
        }
      }
      throw error;
    }
  }

  async listByRiddle(riddleId: string): Promise<AcceptedAnswer[]> {
    const rows = await this.prisma.acceptedAnswer.findMany({
      where: { riddleId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAnswer);
  }
}
