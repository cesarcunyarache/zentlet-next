export type UpdateUserPreferenceInput = {
  userId: string;
  language?: string;
  currency?: string;
  timezone?: string;
  extras?: Record<string, unknown>;
};
