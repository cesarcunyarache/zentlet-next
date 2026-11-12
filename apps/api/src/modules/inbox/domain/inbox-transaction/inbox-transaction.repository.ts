import type {
  AcceptedInboxTransactionDraft,
  DateWindow,
  EmailMovement,
  InboxTransaction,
  MatchableCategory,
  NewInboxTransaction,
} from './inbox-transaction.js';

export abstract class InboxTransactionRepository {
  abstract findPending(userId: string): Promise<InboxTransaction[]>;
  abstract findPendingOwned(userId: string, id: string): Promise<InboxTransaction | null>;
  abstract hasReference(userId: string, reference: string, amount: number): Promise<boolean>;
  abstract insert(item: NewInboxTransaction): Promise<'created' | 'duplicate'>;
  abstract categoryBelongsTo(userId: string, categoryId: string): Promise<boolean>;
  abstract findMatchableCategories(userId: string): Promise<MatchableCategory[]>;
  abstract findSimilarTransactionId(userId: string, movement: EmailMovement, window: DateWindow): Promise<string | null>;
  abstract markDismissed(id: string): Promise<void>;
  // Marks the candidate resolved and returns the data a caller needs to create
  // the real Transaction elsewhere (this module never writes to that table).
  abstract markAccepted(item: InboxTransaction, draft: AcceptedInboxTransactionDraft): Promise<void>;
}
