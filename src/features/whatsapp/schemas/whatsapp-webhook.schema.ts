import { z } from "zod";

const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4096;

const id = z.string().min(1).max(MAX_ID_LENGTH);

const replySchema = z.object({ id, title: z.string().max(MAX_TEXT_LENGTH).optional() });

const mediaSchema = z.object({ id, mime_type: z.string().optional(), caption: z.string().max(MAX_TEXT_LENGTH).optional() });

export const whatsappMessageSchema = z.object({
  id,
  from: z.string().regex(/^\d{6,20}$/),
  type: z.string(),
  text: z.object({ body: z.string().max(MAX_TEXT_LENGTH) }).optional(),
  interactive: z
    .object({
      type: z.string(),
      button_reply: replySchema.optional(),
      list_reply: replySchema.optional(),
    })
    .optional(),
  button: z.object({ payload: z.string().max(MAX_ID_LENGTH).optional(), text: z.string().optional() }).optional(),
  audio: mediaSchema.optional(),
  image: mediaSchema.optional(),
});

export const whatsappWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            metadata: z.object({ phone_number_id: z.string() }).optional(),
            messages: z.array(z.unknown()).optional(),
          }),
        }),
      ),
    }),
  ),
});

export type WhatsappWebhookPayload = z.infer<typeof whatsappWebhookSchema>;
export type WhatsappMessagePayload = z.infer<typeof whatsappMessageSchema>;
