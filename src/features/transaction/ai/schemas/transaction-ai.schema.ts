import { z } from "zod";

export const transactionSuggestionSchema = z.object({
  categoryId: z.string().nullable(),
  type: z.enum(["expense", "income"]),
});

export type TransactionSuggestion = z.infer<typeof transactionSuggestionSchema>;
