export type FeatureFlagError = 'flag_not_found' | 'invalid_rollout';

export const fail = <E extends FeatureFlagError>(error: E): { error: E } => ({ error });
