import { z } from "zod";
import { CATEGORY_LIMITS } from "./category-api.schema";

const MIN_NAME_LENGTH = 2;

export const categorySchema = z.object({
  name: z.string().trim().min(MIN_NAME_LENGTH).max(CATEGORY_LIMITS.name),
  icon: z.string().min(1).max(CATEGORY_LIMITS.icon),
  color: z.string().min(1).max(CATEGORY_LIMITS.color),
  description: z.string().max(CATEGORY_LIMITS.description).optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
