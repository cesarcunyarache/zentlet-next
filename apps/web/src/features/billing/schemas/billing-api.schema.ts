import { z } from "zod";
import { PAID_PLAN_KEYS } from "../lib/plans";

export const checkoutSchema = z.object({
  planKey: z.enum(PAID_PLAN_KEYS),
});

export const refundSchema = z.object({
  paymentId: z.uuid(),
  mode: z.enum(["full", "prorated"]),
  revokeAccess: z.boolean().default(false),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;
