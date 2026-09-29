import { z } from "zod";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MAX_TEXT_LENGTH = 200;
const MAX_AMOUNT = 9_999_999_999;
const MAX_CATEGORY_ID_LENGTH = 64;
const MAX_SUMMARY_IDS = 100;
const MAX_SEARCH_LENGTH = 60;
const MAX_CURSOR_LENGTH = 200;
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 200;

function isCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  return date.toISOString().startsWith(value) && year >= MIN_YEAR && year <= MAX_YEAR;
}

export const isoDate = z
  .string()
  .regex(ISO_DATE_PATTERN, "Formato YYYY-MM-DD")
  .refine(isCalendarDate, "Fecha inexistente");

const fields = {
  description: z.string().trim().max(MAX_TEXT_LENGTH),
  amount: z.number().positive().max(MAX_AMOUNT),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().min(1).max(MAX_CATEGORY_ID_LENGTH),
  transactionDate: isoDate,
  reference: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
};

export const createTransactionSchema = z.object({ id: z.uuid(), ...fields });

export const updateTransactionSchema = z.object(fields).partial();

const range = {
  from: isoDate.optional(),
  to: isoDate.optional(),
};

export const transactionSummaryQuerySchema = z.object({
  ...range,
  ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",") : []))
    .pipe(z.array(z.uuid()).max(MAX_SUMMARY_IDS)),
});

export const transactionListQuerySchema = z.object({
  ...range,
  type: fields.type.optional(),
  categoryId: fields.categoryId.optional(),
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  cursor: z.string().max(MAX_CURSOR_LENGTH).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
