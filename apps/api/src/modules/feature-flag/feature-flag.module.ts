import { Module } from '@nestjs/common';
import { AssignUserFeatureOverrideUseCase } from './application/use-cases/assign-user-feature-override/assign-user-feature-override.use-case.js';
import { RemoveUserFeatureOverrideUseCase } from './application/use-cases/remove-user-feature-override/remove-user-feature-override.use-case.js';
import { ResolveFeatureFlagUseCase } from './application/use-cases/resolve-feature-flag/resolve-feature-flag.use-case.js';
import { SetFeatureFlagUseCase } from './application/use-cases/set-feature-flag/set-feature-flag.use-case.js';
import { FeatureRepository } from './domain/feature/feature.repository.js';
import { UserFeatureRepository } from './domain/user-feature/user-feature.repository.js';
import { PrismaFeatureRepository } from './infrastructure/feature/prisma-feature.repository.js';
import { PrismaUserFeatureRepository } from './infrastructure/user-feature/prisma-user-feature.repository.js';

@Module({
  providers: [
    ResolveFeatureFlagUseCase,
    SetFeatureFlagUseCase,
    AssignUserFeatureOverrideUseCase,
    RemoveUserFeatureOverrideUseCase,
    { provide: FeatureRepository, useClass: PrismaFeatureRepository },
    { provide: UserFeatureRepository, useClass: PrismaUserFeatureRepository },
  ],
  exports: [ResolveFeatureFlagUseCase, SetFeatureFlagUseCase, AssignUserFeatureOverrideUseCase, RemoveUserFeatureOverrideUseCase],
})
export class FeatureFlagModule {}
