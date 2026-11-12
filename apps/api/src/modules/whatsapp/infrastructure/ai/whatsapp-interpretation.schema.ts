import { z } from 'zod';

export const whatsappInterpretationSchema = z.object({
  intent: z.enum(['record', 'chat']),
  type: z.enum(['expense', 'income']).nullable(),
  amount: z.number().nullable(),
  categoryId: z.string().nullable(),
  description: z.string().nullable(),
  reply: z.string().nullable(),
});

export type WhatsappInterpretation = z.infer<typeof whatsappInterpretationSchema>;
