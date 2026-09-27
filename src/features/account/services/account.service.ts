import { APIService } from "@/core/services/api.service";
import type { PreferenceUpdate, Preferences } from "@/features/preference/schemas/preference.schema";

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

  /** El recorrido de bienvenida ya se vio: no vuelve a aparecer. */
  async completeOnboarding(): Promise<void> {
    await this.post("/api/account/onboarding");
  }

  /** `null` si la cuenta aún no tiene preferencias guardadas. */
  async getPreferences(): Promise<Preferences | null> {
    const response = await this.get<Preferences | null>("/api/account/preferences");

    return response.data;
  }

  async updatePreferences(update: PreferenceUpdate): Promise<Preferences> {
    const response = await this.patch<Preferences>("/api/account/preferences", update);

    return response.data;
  }
}

/** Instancia única: el servicio no tiene estado propio. */
export const accountService = new AccountService();
