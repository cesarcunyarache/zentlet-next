import { z } from "zod";
import { FEEDBACK_CONTEXT_LIMITS, FEEDBACK_MAX_LENGTH, FEEDBACK_TYPES } from "../constants";

export const feedbackContextSchema = z.object({
  locale: z.string().max(FEEDBACK_CONTEXT_LIMITS.locale).optional(),
  path: z.string().max(FEEDBACK_CONTEXT_LIMITS.path).optional(),
  userAgent: z.string().max(FEEDBACK_CONTEXT_LIMITS.userAgent).optional(),
  online: z.boolean().optional(),
});

export const createFeedbackSchema = z.object({
  message: z.string().trim().min(1).max(FEEDBACK_MAX_LENGTH),
  type: z.enum(FEEDBACK_TYPES).default("comment"),
  context: feedbackContextSchema.optional(),
});

export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackPayload = z.input<typeof createFeedbackSchema>;
