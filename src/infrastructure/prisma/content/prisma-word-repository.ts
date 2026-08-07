import { Prisma, type PrismaClient } from '@prisma/client';
import type { WordRepository } from '@/modules/content/application/ports';
import type { ContentStatus } from '@/modules/content/domain/content-status';
import { WordNotFoundError } from '@/modules/content/domain/errors';
import type { Word } from '@/modules/content/domain/word';

interface WordRow {
  id: string;
  text: string;
  status: ContentStatus;
  createdByAdminUserId: string;
}

function toWord(row: WordRow): Word {
  return {
    id: row.id,
    text: row.text,
    status: row.status,
    createdByAdminUserId: row.createdByAdminUserId,
  };
}

/** Adapter Prisma do `WordRepository`. */
export class PrismaWordRepository implements WordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    text: string;
    createdByAdminUserId: string;
  }): Promise<Word> {
    const row = await this.prisma.word.create({
      data: {
        text: input.text,
        createdByAdminUserId: input.createdByAdminUserId,
      },
    });
    return toWord(row);
  }

  async findById(id: string): Promise<Word | null> {
    const row = await this.prisma.word.findUnique({ where: { id } });
    return row ? toWord(row) : null;
  }

  async setStatus(id: string, status: ContentStatus): Promise<Word> {
    try {
      const row = await this.prisma.word.update({
        where: { id },
        data: { status },
      });
      return toWord(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new WordNotFoundError(id);
      }
      throw error;
    }
  }
}
