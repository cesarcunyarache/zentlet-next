import type { Feature } from '../../../domain/feature/feature.js';
import type { FeatureFlagError } from '../../../domain/feature-flag.errors.js';

export type SetFeatureFlagOutput = { flag: Feature } | { error: FeatureFlagError };
