import { color } from "framer-motion";
import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener mínimo 2 caracteres"),

  icon: z.string().min(1, "Selecciona un icono"),

  color: z.string().min(1, "El color debe tener mínimo 1 caracter"),

  description: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
