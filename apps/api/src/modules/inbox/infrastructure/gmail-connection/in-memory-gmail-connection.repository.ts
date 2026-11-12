import { Injectable } from '@nestjs/common';
import type { GmailConnection, GmailConnectionData } from '../../domain/gmail-connection/gmail-connection.js';
import { GmailConnectionRepository } from '../../domain/gmail-connection/gmail-connection.repository.js';

@Injectable()
export class InMemoryGmailConnectionRepository extends GmailConnectionRepository {
  private readonly connections = new Map<string, GmailConnection>();

  seed(connection: GmailConnection): void {
    this.connections.set(connection.id, connection);
  }

  async findByUser(userId: string): Promise<GmailConnection | null> {
    return [...this.connections.values()].find((connection) => connection.userId === userId) ?? null;
  }

  async findByEmail(email: string): Promise<GmailConnection | null> {
    return [...this.connections.values()].find((connection) => connection.email === email) ?? null;
  }

  async findActive(): Promise<GmailConnection[]> {
    return [...this.connections.values()].filter((connection) => connection.status === 'active');
  }

  async save(userId: string, data: GmailConnectionData): Promise<'saved' | 'taken'> {
    const takenByAnotherUser = [...this.connections.values()].some((connection) => connection.email === data.email && connection.userId !== userId);
    if (takenByAnotherUser) return 'taken';

    const existing = await this.findByUser(userId);
    const connection: GmailConnection = { id: existing?.id ?? crypto.randomUUID(), userId, lastSyncedAt: existing?.lastSyncedAt ?? null, ...data };
    this.connections.set(connection.id, connection);
    return 'saved';
  }

  async markRevoked(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) this.connections.set(id, { ...connection, status: 'revoked' });
  }

  async saveProgress(id: string, historyId: bigint): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) return;
    const movesForward = connection.historyId === null || connection.historyId < historyId;
    this.connections.set(id, { ...connection, historyId: movesForward ? historyId : connection.historyId, lastSyncedAt: new Date() });
  }

  async updateWatchExpiry(id: string, watchExpiresAt: Date): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) this.connections.set(id, { ...connection, watchExpiresAt });
  }

  async deleteById(id: string): Promise<void> {
    this.connections.delete(id);
  }
}
