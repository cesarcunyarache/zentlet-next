import { z } from "zod";

export const transactionSchema = z.object({
  description: z.string().trim().max(42, "Máximo 42 caracteres"),

  amount: z.number().positive("El monto debe ser mayor a 0"),

  type: z.enum(["expense", "income"]),

  categoryId: z.string().min(1, "Selecciona una categoría"),

  transactionDate: z.string().min(1, "Selecciona una fecha"),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
