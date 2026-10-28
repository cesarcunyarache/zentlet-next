import { isRecordNotFound, isUniqueViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import type { FeatureFlagChanges, NewFeatureFlag } from "../../../domain/entities/feature-flag.entity";
import type { FeatureFlagRepository } from "../../../domain/repositories/feature-flag.repository";
import { toFeatureFlag, toFeatureFlagWithUsage } from "./feature-flag.mapper";

export class PrismaFeatureFlagRepository implements FeatureFlagRepository {
  async findAllWithUsage() {
    const rows = await prisma.feature.findMany({
      orderBy: { slug: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return rows.map(toFeatureFlagWithUsage);
  }

  findDefinitions() {
    return prisma.feature.findMany({ select: { slug: true, enabled: true, rollout: true } });
  }

  async insert({ slug, type, description }: NewFeatureFlag, actor: string) {
    try {
      const row = await prisma.feature.create({ data: { slug, type, description, updatedBy: actor } });
      return toFeatureFlag(row);
    } catch (error) {
      if (isUniqueViolation(error)) return "slug_taken" as const;
      throw error;
    }
  }

  async update(slug: string, changes: FeatureFlagChanges, actor: string) {
    try {
      const row = await prisma.feature.update({ where: { slug }, data: { ...changes, updatedBy: actor } });
      return toFeatureFlag(row);
    } catch (error) {
      if (isRecordNotFound(error)) return "flag_not_found" as const;
      throw error;
    }
  }

  async delete(slug: string) {
    try {
      await prisma.feature.delete({ where: { slug } });
      return "deleted" as const;
    } catch (error) {
      if (isRecordNotFound(error)) return "flag_not_found" as const;
      throw error;
    }
  }

  async markUsed(slug: string, notUsedSince: Date, usedAt: Date) {
    await prisma.feature.updateMany({
      where: { slug, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: notUsedSince } }] },
      data: { lastUsedAt: usedAt },
    });
  }
}
