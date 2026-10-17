import { createTranslator } from "next-intl";
import type { Locale } from "@/i18n/routing";
import en from "@/locales/en/notifications.json";
import es from "@/locales/es/notifications.json";
import { notificationMessage } from "../lib/message";
import type { NotificationText, TNotification } from "../types";

const MESSAGES = { es, en } satisfies Record<Locale, typeof es>;

export function notificationText(locale: Locale, notification: TNotification): NotificationText {
  const t = createTranslator({ locale, messages: { notifications: MESSAGES[locale] }, namespace: "notifications" });
  const { title, body, values } = notificationMessage(notification);
  return { title: t(title, values), body: t(body, values) };
}
