import { vi } from "vitest";
import type { NotificationChannel, NotificationInput } from "../../../../types";
import type { ClaimedDelivery } from "../../../domain/entities/notification.entity";
import type { ChannelFlags, ChannelSender, NotificationMonitor } from "../../../domain/ports/notification.ports";
import type { DeliveryRepository } from "../../../domain/repositories/delivery.repository";
import type { NotificationRepository } from "../../../domain/repositories/notification.repository";

export const input = {
  type: "budget.exceeded" as const,
  userId: "user-1",
  dedupeKey: "budget:b1:2026-09-01:exceeded",
  data: { budgetId: "b1", categoryName: "Comida", currency: "PEN" as const, spent: 1100, limit: 1000, periodFrom: "2026-09-01" },
};

export function claimed(attempts: number, channel = "email"): ClaimedDelivery {
  return {
    id: "delivery-1",
    channel,
    attempts,
    notification: { id: "n1", type: input.type, data: input.data, readAt: null, createdAt: "2026-09-30T12:00:00.000Z" },
    recipient: { email: "ana@example.com", name: "Ana", locale: "es" },
  };
}

export function fakeNotifications() {
  const notifications: NotificationRepository = {
    createWithDeliveries: vi.fn(async (_input: NotificationInput, channels: NotificationChannel[]) =>
      channels.map((_channel, index) => `delivery-${index + 1}`),
    ),
    findLatest: vi.fn().mockResolvedValue([]),
    countUnread: vi.fn().mockResolvedValue(0),
    markAllRead: vi.fn().mockResolvedValue(undefined),
  };
  const deliveries: DeliveryRepository = {
    claim: vi.fn().mockResolvedValue(claimed(1)),
    saveOutcome: vi.fn().mockResolvedValue(undefined),
    findDueIds: vi.fn().mockResolvedValue([]),
  };
  const flags: ChannelFlags = { isEnabled: vi.fn().mockResolvedValue(true) };
  const sender: ChannelSender = {
    supports: (channel): channel is "email" => channel === "email",
    send: vi.fn().mockResolvedValue(true),
  };
  const monitor: NotificationMonitor = { created: vi.fn(), sendFailed: vi.fn(), deliveryFailed: vi.fn() };
  return { notifications, deliveries, flags, sender, monitor };
}
