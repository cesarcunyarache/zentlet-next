export const FEEDBACK_TYPES = ["comment", "bug", "idea"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_MAX_LENGTH = 2000;

export const FEEDBACK_CONTEXT_LIMITS = { locale: 10, path: 200, userAgent: 400 } as const;
