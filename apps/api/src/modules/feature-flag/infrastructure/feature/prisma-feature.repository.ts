import { Injectable } from '@nestjs/common';
import type { Feature as FeatureRow } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { Feature, FeatureChanges } from '../../domain/feature/feature.js';
import { FeatureRepository } from '../../domain/feature/feature.repository.js';
import { isRecordNotFound } from '../db-errors.js';

function toFeature(row: FeatureRow): Feature {
  return {
    slug: row.slug,
    enabled: row.enabled,
    rollout: row.rollout,
    description: row.description,
    type: row.type,
    stale: row.stale,
    lastUsedAt: row.lastUsedAt,
    updatedBy: row.updatedBy,
  };
}

@Injectable()
export class PrismaFeatureRepository extends FeatureRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<Feature[]> {
    const rows = await this.prisma.feature.findMany({ orderBy: { slug: 'asc' } });
    return rows.map(toFeature);
  }

  async findBySlug(slug: string): Promise<Feature | null> {
    const row = await this.prisma.feature.findUnique({ where: { slug } });
    return row ? toFeature(row) : null;
  }

  async update(slug: string, changes: FeatureChanges, actor: string): Promise<Feature | null> {
    try {
      const row = await this.prisma.feature.update({ where: { slug }, data: { ...changes, updatedBy: actor } });
      return toFeature(row);
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  async markStale(slug: string, stale: boolean): Promise<Feature | null> {
    try {
      const row = await this.prisma.feature.update({ where: { slug }, data: { stale } });
      return toFeature(row);
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  async markUsed(slug: string, notUsedSince: Date, usedAt: Date): Promise<void> {
    await this.prisma.feature.updateMany({
      where: { slug, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: notUsedSince } }] },
      data: { lastUsedAt: usedAt },
    });
  }
}
