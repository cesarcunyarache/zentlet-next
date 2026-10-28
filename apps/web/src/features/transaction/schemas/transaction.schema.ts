import { z } from "zod";

export const DESCRIPTION_MAX_LENGTH = 42;

export const transactionSchema = z.object({
  description: z.string().trim().max(DESCRIPTION_MAX_LENGTH, `Máximo ${DESCRIPTION_MAX_LENGTH} caracteres`),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  transactionDate: z.string().min(1, "Selecciona una fecha"),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
