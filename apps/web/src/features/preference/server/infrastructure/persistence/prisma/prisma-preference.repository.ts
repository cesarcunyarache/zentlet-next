import prisma from "@/lib/prisma";
import { preferencesSchema, type PreferenceUpdate } from "../../../../schemas/preference.schema";
import type { PreferenceRepository } from "../../../domain/repositories/preference.repository";

const PREFERENCE_SELECT = { language: true, currency: true, timezone: true, extras: true } as const;

export class PrismaPreferenceRepository implements PreferenceRepository {
  async find(userId: string) {
    const row = await prisma.userPreference.findUnique({ where: { userId }, select: PREFERENCE_SELECT });
    if (!row) return null;
    return preferencesSchema.parse(row);
  }

  async save(userId: string, changes: PreferenceUpdate) {
    const row = await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...changes },
      update: changes,
      select: PREFERENCE_SELECT,
    });
    return preferencesSchema.parse(row);
  }

  async findTimezone(userId: string) {
    const preference = await prisma.userPreference.findUnique({ where: { userId }, select: { timezone: true } });
    return preference?.timezone ?? null;
  }
}
