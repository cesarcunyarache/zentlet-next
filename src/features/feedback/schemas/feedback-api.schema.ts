import { z } from "zod";
import { FEEDBACK_MAX_LENGTH, FEEDBACK_TYPES } from "../constants";

/*
 * Contrato de `POST /api/feedback`. El contexto es sólo técnico, para poder
 * reproducir un problema: nunca montos, movimientos ni categorías.
 */

export const feedbackContextSchema = z.object({
  locale: z.string().max(10).optional(),
  path: z.string().max(200).optional(),
  userAgent: z.string().max(400).optional(),
  online: z.boolean().optional(),
});

export const createFeedbackSchema = z.object({
  message: z.string().trim().min(1).max(FEEDBACK_MAX_LENGTH),
  type: z.enum(FEEDBACK_TYPES).default("comment"),
  context: feedbackContextSchema.optional(),
});

export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackPayload = z.input<typeof createFeedbackSchema>;
