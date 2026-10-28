import { APIService } from "@/core/services/api.service";
import type {
  InviteRole,
  TCreatedInvite,
  TInvitePreview,
  TList,
  TListDetail,
  TListEntryPage,
  TListInvite,
  TListPayload,
} from "../types";

const BASE_URL = "/api/list";
const INVITE_URL = "/api/list-invite";

class ListService extends APIService {
  async getLists(): Promise<TList[]> {
    const response = await this.get<TList[]>(BASE_URL);
    return response.data;
  }

  async getList(listId: string): Promise<TListDetail> {
    const response = await this.get<TListDetail>(`${BASE_URL}/${listId}`);
    return response.data;
  }

  async getEntries(listId: string, cursor: string | null, limit: number): Promise<TListEntryPage> {
    const response = await this.get<TListEntryPage>(`${BASE_URL}/${listId}/entries`, {
      limit,
      ...(cursor ? { cursor } : {}),
    });
    return response.data;
  }

  async createList(data: TListPayload & { id: string }): Promise<TList> {
    const response = await this.post<TList>(BASE_URL, data);
    return response.data;
  }

  async updateList(listId: string, data: Partial<TListPayload>): Promise<void> {
    await this.patch(`${BASE_URL}/${listId}`, data);
  }

  async deleteList(listId: string): Promise<void> {
    await this.delete(`${BASE_URL}/${listId}`);
  }

  async addEntries(listId: string, transactionIds: string[]): Promise<void> {
    await this.post(`${BASE_URL}/${listId}/entries`, { transactionIds });
  }

  async removeEntry(listId: string, transactionId: string): Promise<void> {
    await this.delete(`${BASE_URL}/${listId}/entries/${transactionId}`);
  }

  async getInvites(listId: string): Promise<TListInvite[]> {
    const response = await this.get<TListInvite[]>(`${BASE_URL}/${listId}/invites`);
    return response.data;
  }

  async createInvite(listId: string, role: InviteRole): Promise<TCreatedInvite> {
    const response = await this.post<TCreatedInvite>(`${BASE_URL}/${listId}/invites`, { role });
    return response.data;
  }

  async emailInvite(listId: string, data: { role: InviteRole; email: string; locale: string }): Promise<TListInvite> {
    const response = await this.post<TListInvite>(`${BASE_URL}/${listId}/invites/email`, data);
    return response.data;
  }

  async revokeInvite(listId: string, inviteId: string): Promise<void> {
    await this.delete(`${BASE_URL}/${listId}/invites/${inviteId}`);
  }

  async updateMember(listId: string, userId: string, role: InviteRole): Promise<void> {
    await this.patch(`${BASE_URL}/${listId}/members/${userId}`, { role });
  }

  async removeMember(listId: string, userId: string): Promise<void> {
    await this.delete(`${BASE_URL}/${listId}/members/${userId}`);
  }

  async previewInvite(token: string): Promise<TInvitePreview> {
    const response = await this.get<TInvitePreview>(`${INVITE_URL}/${token}`);
    return response.data;
  }

  async acceptInvite(token: string): Promise<{ listId: string; joined: boolean }> {
    const response = await this.post<{ listId: string; joined: boolean }>(`${INVITE_URL}/${token}`);
    return response.data;
  }
}

export const listService = new ListService();
