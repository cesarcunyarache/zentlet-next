import type { GmailConnection, GmailConnectionData } from "../entities/gmail-connection.entity";

export interface GmailConnectionRepository {
  findByUser(userId: string): Promise<GmailConnection | null>;

  findByEmail(email: string): Promise<GmailConnection | null>;

  findActive(): Promise<GmailConnection[]>;

  save(userId: string, data: GmailConnectionData): Promise<"saved" | "taken">;

  markRevoked(id: string): Promise<void>;

  saveProgress(id: string, historyId: bigint): Promise<void>;

  updateWatchExpiry(id: string, watchExpiresAt: Date): Promise<void>;

  deleteById(id: string): Promise<void>;
}
