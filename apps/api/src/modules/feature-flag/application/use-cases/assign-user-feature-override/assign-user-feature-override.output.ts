import type { UserFeature } from '../../../domain/user-feature/user-feature.js';
import type { FeatureFlagError } from '../../../domain/feature-flag.errors.js';

export type AssignUserFeatureOverrideOutput = { override: UserFeature } | { error: FeatureFlagError };
