import type { PrismaClient } from '@prisma/client';
import type { GameConfigurationRepository } from '@/modules/content/application/ports';
import type { CurrentGameConfiguration } from '@/modules/content/domain/game-configuration';

/** Adapter Prisma do `GameConfigurationRepository` (somente leitura). */
export class PrismaGameConfigurationRepository implements GameConfigurationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCurrent(): Promise<CurrentGameConfiguration | null> {
    const row = await this.prisma.gameConfiguration.findFirst({
      where: { isCurrent: true },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      pointsPerApproval: row.pointsPerApproval,
      uploadGraceSeconds: row.uploadGraceSeconds,
      challengesPerRound: row.challengesPerRound,
      timeLimitSeconds: row.timeLimitSeconds,
      isCurrent: true,
    };
  }
}
