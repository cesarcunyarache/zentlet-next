import { APIService } from "@/core/services/api.service";

/**
 * Capa de acceso a la API de la cuenta. Sólo HTTP, como el resto de
 * servicios: los errores se propagan tal cual (`AxiosError`).
 */
export class AccountService extends APIService {
  /** Excel con todos los movimientos y categorías del usuario. */
  async exportData(params: { locale: string; currency: string }): Promise<Blob> {
    const response = await this.get<Blob>("/api/account/export", params, { responseType: "blob" });

    return response.data;
  }
}

/** Instancia única: el servicio no tiene estado propio. */
export const accountService = new AccountService();
