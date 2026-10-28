import { isForeignKeyViolation } from "@/lib/db-errors";
import prisma from "@/lib/prisma";
import type { UserFlagRepository } from "../../../domain/repositories/user-flag.repository";

export class PrismaUserFlagRepository implements UserFlagRepository {
  async findOverrides(userId: string) {
    const rows = await prisma.userFeature.findMany({
      where: { userId },
      select: { featureId: true, enabled: true },
    });
    return Object.fromEntries(rows.map((row) => [row.featureId, row.enabled]));
  }

  async assign(userId: string, slug: string, enabled: boolean, actor: string) {
    try {
      return await prisma.userFeature.upsert({
        where: { userId_featureId: { userId, featureId: slug } },
        create: { userId, featureId: slug, enabled, assignedBy: actor },
        update: { enabled, assignedBy: actor, assignedAt: new Date() },
        select: { userId: true, featureId: true, enabled: true, assignedBy: true, assignedAt: true },
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) return "flag_not_found" as const;
      throw error;
    }
  }

  async clear(userId: string, slug: string) {
    await prisma.userFeature.deleteMany({ where: { userId, featureId: slug } });
  }
}
