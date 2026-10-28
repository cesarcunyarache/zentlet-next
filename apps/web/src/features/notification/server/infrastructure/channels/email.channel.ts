import { sendEmail } from "@/lib/email";
import { notificationEmail } from "@/lib/email/templates";
import type { TNotification } from "../../../types";
import type { Recipient } from "../../domain/entities/notification.entity";
import { notificationText } from "./notification-text";

export function sendEmailNotification(notification: TNotification, { email, name, locale }: Recipient) {
  const text = notificationText(locale, notification);
  return sendEmail(notificationEmail(locale, { to: email, name, ...text }));
}
