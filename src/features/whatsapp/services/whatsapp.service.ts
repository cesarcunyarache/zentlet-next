import { APIService } from "@/core/services/api.service";
import type { TWhatsappConnection, TWhatsappLinkCode } from "../types";

class WhatsappService extends APIService {
  async getConnection(): Promise<TWhatsappConnection> {
    return (await this.get<TWhatsappConnection>("/api/whatsapp/connection")).data;
  }

  async createLinkCode(): Promise<TWhatsappLinkCode> {
    return (await this.post<TWhatsappLinkCode>("/api/whatsapp/connection")).data;
  }

  async unlink(): Promise<TWhatsappConnection> {
    return (await this.delete<TWhatsappConnection>("/api/whatsapp/connection")).data;
  }
}

export const whatsappService = new WhatsappService();
