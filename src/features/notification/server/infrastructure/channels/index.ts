import type { NotificationChannel } from "../../../types";
import { emailChannel } from "./email.channel";
import type { ChannelStrategy } from "./channel-strategy";

export const channels: Record<NotificationChannel, ChannelStrategy> = {
  email: emailChannel,
};

export const isChannel = (value: string): value is NotificationChannel => value in channels;
