import { z } from "zod";

export const categoryIconSchema = z.object({
  icon: z.string(),
  color: z.string(),
});

export const categoryAiSchema = z.object({
  categories: z.array(categoryIconSchema),
});

export type CategoryIcon = z.infer<typeof categoryIconSchema>;
export type CategoryAI = z.infer<typeof categoryAiSchema>;
