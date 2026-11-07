import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { mergeExtras } from "../../../domain/merge-extras";
import { preferencesSchema, type PreferenceUpdate } from "../../../../schemas/preference.schema";
import type { PreferenceRepository } from "../../../domain/repositories/preference.repository";

const PREFERENCE_SELECT = { language: true, currency: true, timezone: true, extras: true } as const;

export class PrismaPreferenceRepository implements PreferenceRepository {
  async find(userId: string) {
    const row = await prisma.userPreference.findUnique({ where: { userId }, select: PREFERENCE_SELECT });
    if (!row) return null;
    return preferencesSchema.parse(row);
  }

  async save(userId: string, { extras, ...fields }: PreferenceUpdate) {
    if (!extras) return preferencesSchema.parse(await this.upsert(prisma, userId, fields));

    const row = await prisma.$transaction(async (db) => {
      const stored = await db.userPreference.findUnique({ where: { userId }, select: { extras: true } });
      return this.upsert(db, userId, { ...fields, extras: mergeExtras(stored?.extras, extras) });
    });
    return preferencesSchema.parse(row);
  }

  private upsert(db: Pick<typeof prisma, "userPreference">, userId: string, data: Prisma.UserPreferenceUpdateInput) {
    return db.userPreference.upsert({
      where: { userId },
      create: { userId, ...data } as Prisma.UserPreferenceUncheckedCreateInput,
      update: data,
      select: PREFERENCE_SELECT,
    });
  }

  async findTimezone(userId: string) {
    const preference = await prisma.userPreference.findUnique({ where: { userId }, select: { timezone: true } });
    return preference?.timezone ?? null;
  }
}
