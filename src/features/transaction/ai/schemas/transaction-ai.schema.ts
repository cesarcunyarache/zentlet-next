import { z } from "zod";
import { CATEGORY_LIMITS } from "@/features/category/schemas/category-api.schema";

const MAX_CATEGORY_ID_LENGTH = 64;
const MAX_CATEGORIES = 200;

export const suggestCategoryInputSchema = z.object({
  description: z.string(),
  categories: z
    .array(
      z.object({
        id: z.string().min(1).max(MAX_CATEGORY_ID_LENGTH),
        name: z.string().max(CATEGORY_LIMITS.name),
      }),
    )
    .max(MAX_CATEGORIES),
});

export type SuggestCategoryInput = z.infer<typeof suggestCategoryInputSchema>;

export const transactionSuggestionSchema = z.object({
  categoryId: z.string().nullable(),
  type: z.enum(["expense", "income"]),
});

export type TransactionSuggestion = z.infer<typeof transactionSuggestionSchema>;
