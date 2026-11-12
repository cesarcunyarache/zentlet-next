import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import { sanitizeStoredUserPreference, type UserPreference } from '../../domain/preference/user-preference.js';
import { UserPreferenceRepository } from '../../domain/preference/user-preference.repository.js';

const PREFERENCE_SELECT = { language: true, currency: true, timezone: true, extras: true } as const;

@Injectable()
export class PrismaUserPreferenceRepository extends UserPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserId(userId: string): Promise<UserPreference | null> {
    const row = await this.prisma.userPreference.findUnique({ where: { userId }, select: PREFERENCE_SELECT });
    return row ? sanitizeStoredUserPreference(row) : null;
  }

  async upsert(userId: string, changes: Partial<UserPreference>): Promise<UserPreference> {
    const row = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...changes },
      update: changes,
      select: PREFERENCE_SELECT,
    });
    return sanitizeStoredUserPreference(row);
  }
}
