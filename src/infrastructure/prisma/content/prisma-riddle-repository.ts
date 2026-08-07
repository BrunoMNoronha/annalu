import { Prisma, type PrismaClient } from '@prisma/client';
import type { RiddleRepository } from '@/modules/content/application/ports';
import type { ContentStatus } from '@/modules/content/domain/content-status';
import {
  RiddleNotFoundError,
  WordNotFoundError,
} from '@/modules/content/domain/errors';
import type { Riddle } from '@/modules/content/domain/riddle';

interface RiddleRow {
  id: string;
  wordId: string;
  prompt: string;
  status: ContentStatus;
}

function toRiddle(row: RiddleRow): Riddle {
  return {
    id: row.id,
    wordId: row.wordId,
    prompt: row.prompt,
    status: row.status,
  };
}

/** Adapter Prisma do `RiddleRepository`. */
export class PrismaRiddleRepository implements RiddleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { wordId: string; prompt: string }): Promise<Riddle> {
    try {
      const row = await this.prisma.riddle.create({
        data: { wordId: input.wordId, prompt: input.prompt },
      });
      return toRiddle(row);
    } catch (error) {
      // FK inexistente para a palavra → charada sem palavra válida.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new WordNotFoundError(input.wordId);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Riddle | null> {
    const row = await this.prisma.riddle.findUnique({ where: { id } });
    return row ? toRiddle(row) : null;
  }

  async setStatus(id: string, status: ContentStatus): Promise<Riddle> {
    try {
      const row = await this.prisma.riddle.update({
        where: { id },
        data: { status },
      });
      return toRiddle(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new RiddleNotFoundError(id);
      }
      throw error;
    }
  }
}
