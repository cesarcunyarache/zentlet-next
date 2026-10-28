export type FeatureFlagError = "flag_not_found" | "slug_taken" | "invalid_rollout" | "user_not_found";

export const fail = <E extends FeatureFlagError>(error: E) => ({ error });
