import type { Locale } from "@/i18n/routing";
import type { TNotification } from "../../types";

interface Recipient {
  email: string;
  name: string;
  locale: Locale;
}

export interface ChannelStrategy {
  send(notification: TNotification, recipient: Recipient): Promise<boolean>;
}
