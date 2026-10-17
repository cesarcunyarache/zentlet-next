import { sendEmail } from "@/lib/email";
import { notificationEmail } from "@/lib/email/templates";
import { notificationText } from "./notification-text";
import type { ChannelStrategy } from "./channel-strategy";

export const emailChannel: ChannelStrategy = {
  send(notification, { email, name, locale }) {
    const text = notificationText(locale, notification);
    return sendEmail(notificationEmail(locale, { to: email, name, ...text }));
  },
};
