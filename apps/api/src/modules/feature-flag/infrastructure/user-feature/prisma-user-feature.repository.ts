import { Injectable } from '@nestjs/common';
import type { UserFeature as UserFeatureRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { UserFeature } from '../../domain/user-feature/user-feature.js';
import { UserFeatureRepository } from '../../domain/user-feature/user-feature.repository.js';
import { isForeignKeyViolation } from '../db-errors.js';

function toUserFeature(row: UserFeatureRow): UserFeature {
  return {
    userId: row.userId,
    featureId: row.featureId,
    enabled: row.enabled,
    assignedBy: row.assignedBy,
    assignedAt: row.assignedAt,
  };
}

@Injectable()
export class PrismaUserFeatureRepository extends UserFeatureRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOverride(userId: string, slug: string): Promise<UserFeature | null> {
    const row = await this.prisma.userFeature.findUnique({
      where: { userId_featureId: { userId, featureId: slug } },
    });
    return row ? toUserFeature(row) : null;
  }

  async assign(userId: string, slug: string, enabled: boolean, actor: string): Promise<UserFeature | 'flag_not_found'> {
    try {
      const row = await this.prisma.userFeature.upsert({
        where: { userId_featureId: { userId, featureId: slug } },
        create: { userId, featureId: slug, enabled, assignedBy: actor },
        update: { enabled, assignedBy: actor, assignedAt: new Date() },
      });
      return toUserFeature(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) return 'flag_not_found';
      throw error;
    }
  }

  async remove(userId: string, slug: string): Promise<void> {
    await this.prisma.userFeature.deleteMany({ where: { userId, featureId: slug } });
  }
}
