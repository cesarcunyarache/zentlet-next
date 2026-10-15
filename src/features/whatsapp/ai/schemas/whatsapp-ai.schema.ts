import { z } from "zod";

export const WHATSAPP_AUDIO_MAX_BYTES = 5_000_000;

export const interpretationSchema = z.object({
  intent: z.enum(["record", "answer", "cancel", "undo", "summary", "help", "chat"]),
  movements: z.array(
    z.object({
      type: z.enum(["expense", "income"]).nullable(),
      amount: z.number().nullable(),
      categoryId: z.string().nullable(),
      description: z.string().nullable(),
      date: z.string().nullable(),
    }),
  ),
  period: z.object({ from: z.string().nullable(), to: z.string().nullable() }).nullable(),
  reply: z.string().nullable(),
});

export type InterpretationOutput = z.infer<typeof interpretationSchema>;
