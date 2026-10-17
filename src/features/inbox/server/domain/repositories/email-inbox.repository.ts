import type { EmailInbox, EmailVerification } from "../entities/email-inbox.entity";

export interface EmailInboxRepository {
  findByUser(userId: string): Promise<EmailInbox | null>;

  findByAddresses(addresses: string[]): Promise<EmailInbox | null>;

  insert(userId: string, address: string): Promise<EmailInbox | "conflict">;

  recordReceipt(id: string, receivedAt: Date, verification: EmailVerification | null): Promise<void>;
}
