export type WhatsappMessengerConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
};

const DEFAULT_GRAPH_VERSION = 'v23.0';

export function readWhatsappMessengerConfig(): WhatsappMessengerConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION,
  };
}
