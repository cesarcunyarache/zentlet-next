import { z } from "zod";

export const transactionSuggestionSchema = z.object({
  /** Id de una categoría existente del usuario, o null si ninguna encaja. */
  categoryId: z.string().nullable(),
  type: z.enum(["expense", "income"]),
});

export type TransactionSuggestion = z.infer<typeof transactionSuggestionSchema>;
