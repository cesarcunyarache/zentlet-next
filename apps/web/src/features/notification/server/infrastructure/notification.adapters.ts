import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import { featureFlagUseCases } from "@/features/feature-flag/server/infrastructure/feature-flag.container";
import { channelFlag } from "../../lib/channels";
import type { NotificationChannel } from "../../types";
import type { ChannelFlags, ChannelSender, NotificationMonitor } from "../domain/ports/notification.ports";
import { sendEmailNotification } from "./channels/email.channel";

const SENDERS = {
  email: sendEmailNotification,
} satisfies Record<NotificationChannel, unknown>;

export const channelFlags: ChannelFlags = {
  isEnabled: (userId, channel) => featureFlagUseCases.isEnabled.execute(userId, channelFlag(channel)),
};

export const channelSender: ChannelSender = {
  supports: (channel): channel is NotificationChannel => channel in SENDERS,
  send: (channel, notification, recipient) => SENDERS[channel](notification, recipient),
};

export const notificationMonitor: NotificationMonitor = {
  created: (type, channels) => logger.info({ type, channels }, "notification.created"),
  sendFailed: (error, channel) => reportError(error, "notification.send_failed", { channel }),
  deliveryFailed: (deliveryId, channel, attempts) =>
    logger.warn({ deliveryId, channel, attempts }, "notification.delivery_failed"),
};
