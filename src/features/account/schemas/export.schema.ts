import { z } from "zod";
import { routing } from "@/i18n/routing";

const MAX_CURRENCY_SYMBOL_LENGTH = 4;

export const exportQuerySchema = z.object({
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
  currency: z
    .string()
    .trim()
    .transform((symbol) => symbol.slice(0, MAX_CURRENCY_SYMBOL_LENGTH))
    .optional(),
});

export type ExportQuery = z.infer<typeof exportQuerySchema>;
