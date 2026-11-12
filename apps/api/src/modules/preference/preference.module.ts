import { Module } from '@nestjs/common';
import { GetUserPreferenceUseCase } from './application/use-cases/get-user-preference/get-user-preference.use-case.js';
import { UpdateUserPreferenceUseCase } from './application/use-cases/update-user-preference/update-user-preference.use-case.js';
import { UserPreferenceRepository } from './domain/preference/user-preference.repository.js';
import { PrismaUserPreferenceRepository } from './infrastructure/preference/prisma-user-preference.repository.js';

@Module({
  providers: [
    GetUserPreferenceUseCase,
    UpdateUserPreferenceUseCase,
    { provide: UserPreferenceRepository, useClass: PrismaUserPreferenceRepository },
  ],
  exports: [GetUserPreferenceUseCase, UpdateUserPreferenceUseCase],
})
export class PreferenceModule {}
