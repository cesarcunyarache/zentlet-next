import { APIService } from "@/core/services/api.service";
import type { NotificationFeed } from "../types";

export class NotificationService extends APIService {
  async getFeed(): Promise<NotificationFeed> {
    const response = await this.get<NotificationFeed>("/api/notification");
    return response.data;
  }

  async markAllRead(): Promise<void> {
    await this.post("/api/notification/read");
  }
}

export const notificationService = new NotificationService();
