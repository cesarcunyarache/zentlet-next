import { APIService } from "@/core/services/api.service";
import type { TTransaction } from "@/features/transaction/types";
import type { AcceptInboxItemInput } from "../schemas/inbox-api.schema";
import type { TInboxConnection, TInboxItem, TInboxSender } from "../types";

class InboxService extends APIService {
  async getItems(): Promise<TInboxItem[]> {
    return (await this.get<TInboxItem[]>("/api/inbox")).data;
  }

  async accept(id: string, values: AcceptInboxItemInput): Promise<TTransaction> {
    return (await this.post<TTransaction>(`/api/inbox/${id}/accept`, values)).data;
  }

  async dismiss(id: string): Promise<void> {
    await this.post(`/api/inbox/${id}/dismiss`);
  }

  async getConnection(): Promise<TInboxConnection> {
    return (await this.get<TInboxConnection>("/api/inbox/connection")).data;
  }

  async connect(): Promise<TInboxConnection> {
    return (await this.post<TInboxConnection>("/api/inbox/connection")).data;
  }

  async addSender(address: string): Promise<TInboxSender> {
    return (await this.post<TInboxSender>("/api/inbox/senders", { address })).data;
  }

  async removeSender(id: string): Promise<void> {
    await this.delete(`/api/inbox/senders/${id}`);
  }
}

export const inboxService = new InboxService();
