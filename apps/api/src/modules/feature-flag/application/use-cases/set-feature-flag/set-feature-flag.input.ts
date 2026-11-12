export type SetFeatureFlagInput = {
  slug: string;
  actor: string;
  enabled?: boolean;
  rollout?: number;
  description?: string | null;
};
