import type { AcceptedInboxTransactionDraft } from '../../../domain/inbox-transaction/inbox-transaction.js';

// What a caller needs to create the real Transaction elsewhere: this module
// never writes to the transaction table itself.
export type AcceptInboxTransactionOutput = {
  inboxTransactionId: string;
  transaction: AcceptedInboxTransactionDraft;
};
