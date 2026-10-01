import { z } from "zod";
import { transactionSchema } from "@/features/transaction/schemas/transaction.schema";

export const acceptInboxItemSchema = transactionSchema.extend({
  transactionDate: z.iso.date(),
});

export type AcceptInboxItemInput = z.infer<typeof acceptInboxItemSchema>;

export const addInboxSenderSchema = z.object({
  address: z.string().trim().min(3).max(254),
});
