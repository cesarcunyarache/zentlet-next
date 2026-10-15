import type { ErrorTable } from "@/lib/api/route-helpers";
import type { WhatsappError } from "../../domain/errors/whatsapp.errors";

export const WHATSAPP_ERRORS: ErrorTable<WhatsappError> = {
  not_available: ["WhatsApp is not available", 404],
  not_linked: ["WhatsApp is not linked", 404],
};
