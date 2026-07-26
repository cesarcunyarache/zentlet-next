import { z } from "zod";

export const categoryAiSchema = z.object({
  categories: z.array(
    z.object({
      icon: z.string(),
      color: z.string(),
    }),
  ),
});

export type CategoryAI = z.infer<typeof categoryAiSchema>;
