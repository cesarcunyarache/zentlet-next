const DEFAULT_GRAPH_VERSION = "v23.0";

export interface WhatsappConfig {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
  businessPhone: string;
  graphVersion: string;
}

const env = (name: string) => process.env[name]?.trim() || null;

export function readWhatsappConfig(): WhatsappConfig | null {
  const accessToken = env("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const appSecret = env("WHATSAPP_APP_SECRET");
  const verifyToken = env("WHATSAPP_VERIFY_TOKEN");
  const businessPhone = env("WHATSAPP_BUSINESS_PHONE")?.replace(/\D/g, "") || null;
  if (!accessToken || !phoneNumberId || !appSecret || !verifyToken || !businessPhone) return null;
  return {
    accessToken,
    phoneNumberId,
    appSecret,
    verifyToken,
    businessPhone,
    graphVersion: env("WHATSAPP_GRAPH_VERSION") ?? DEFAULT_GRAPH_VERSION,
  };
}
