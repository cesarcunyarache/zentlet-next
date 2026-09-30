import { sendEmail } from "@/lib/email/send-email";
import { notificationEmail } from "@/lib/email/templates";
import { notificationText } from "../text";
import type { ChannelStrategy } from "./types";

export const emailChannel: ChannelStrategy = {
  send(notification, { email, name, locale }) {
    const text = notificationText(locale, notification);
    return sendEmail(notificationEmail(locale, { to: email, name, ...text }));
  },
};
