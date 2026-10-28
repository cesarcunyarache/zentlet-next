import type { InboxSender } from "../entities/inbox-sender.entity";

export interface InboxSenderRepository {
  findAll(userId: string): Promise<InboxSender[]>;

  findRules(userId: string): Promise<InboxSender[]>;

  trust(userId: string, address: string): Promise<InboxSender>;

  recordDismissal(userId: string, address: string): Promise<InboxSender>;

  block(id: string): Promise<void>;

  deleteOwned(userId: string, id: string): Promise<"deleted" | "not_found">;
}
