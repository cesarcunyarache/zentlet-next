import type { RefundMode } from '../../rules/refund.rules.js';

export type RefundPaymentInput = {
  paymentId: string;
  mode: RefundMode;
  revokeAccess: boolean;
};
