import type { NotificationChannel } from "../../types";
import { emailChannel } from "./email";
import type { ChannelStrategy } from "./types";

export const channels: Record<NotificationChannel, ChannelStrategy> = {
  email: emailChannel,
};

export const isChannel = (value: string): value is NotificationChannel => value in channels;
