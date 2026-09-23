import { z } from "zod";

export const transactionSuggestionSchema = z.object({
  /** Id de una categoría existente del usuario, o null si ninguna encaja. */
  categoryId: z.string().nullable(),
  type: z.enum(["expense", "income"]),
  /** Monto mencionado en el texto ("3 millones" → 3000000), o null. */
  amount: z.number().nullable(),
});

export type TransactionSuggestion = z.infer<typeof transactionSuggestionSchema>;
