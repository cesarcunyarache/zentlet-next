import type { Transaction } from "@/features/transaction/server/domain/entities/transaction.entity";
import type { EmailMovement } from "../../../types";
import type {
  DateWindow,
  InboxItem,
  InboxItemAcceptance,
  MatchableCategory,
  NewInboxItem,
} from "../entities/inbox-item.entity";

export interface InboxItemRepository {
  findPending(userId: string): Promise<InboxItem[]>;

  findPendingOwned(userId: string, id: string): Promise<InboxItem | null>;

  hasReference(userId: string, reference: string, amount: number): Promise<boolean>;

  insert(item: NewInboxItem): Promise<"created" | "duplicate">;

  accept(acceptance: InboxItemAcceptance): Promise<Transaction>;

  markDismissed(id: string): Promise<void>;

  categoryBelongsTo(userId: string, categoryId: string): Promise<boolean>;

  findMatchableCategories(userId: string): Promise<MatchableCategory[]>;

  findSimilarTransactionId(userId: string, movement: EmailMovement, window: DateWindow): Promise<string | null>;
}
