import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { isFlagEnabled } from "@/features/feature-flag/server/flags";
import { deliverPending } from "../deliver";
import { notify } from "../notify";

vi.mock("@/lib/prisma", () => ({
  default: {
    notification: { create: vi.fn() },
    notificationDelivery: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/features/feature-flag/server/flags", () => ({ isFlagEnabled: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

const db = vi.mocked(prisma, { deep: true });
const NOW = new Date("2026-09-30T12:00:00.000Z");

const input = {
  type: "budget.exceeded" as const,
  userId: "user-1",
  dedupeKey: "budget:b1:2026-09-01:exceeded",
  data: { budgetId: "b1", categoryName: "Comida", currency: "PEN" as const, spent: 1100, limit: 1000, periodFrom: "2026-09-01" },
};

const claimed = (attempts: number) => ({
  channel: "email",
  attempts,
  notification: {
    id: "n1",
    type: input.type,
    data: input.data,
    readAt: null,
    createdAt: NOW,
    user: { email: "ana@example.com", name: "Ana", preference: { language: "es" } },
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  vi.mocked(isFlagEnabled).mockResolvedValue(true);
  db.notification.create.mockResolvedValue({ deliveries: [{ id: "d1" }] } as never);
  db.notificationDelivery.updateMany.mockResolvedValue({ count: 1 });
  db.notificationDelivery.findUnique.mockResolvedValue(claimed(1) as never);
  vi.mocked(sendEmail).mockResolvedValue(true);
});

describe("notify", () => {
  it("stores the notification with one delivery per enabled channel and sends it", async () => {
    await notify(input);

    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...input, deliveries: { create: [{ channel: "email" }] } },
      }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ana@example.com", subject: "Te pasaste de tu límite en Comida" }),
    );
    expect(db.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { status: "sent", sentAt: NOW },
    });
  });

  it("keeps only the in-app notification when the channel flag is off", async () => {
    vi.mocked(isFlagEnabled).mockResolvedValue(false);
    db.notification.create.mockResolvedValue({ deliveries: [] } as never);

    await notify(input);

    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deliveries: { create: [] } }) }),
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("ignores a duplicate dedupe key", async () => {
    db.notification.create.mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));

    await expect(notify(input)).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("delivery", () => {
  it("does not send a delivery another worker already claimed", async () => {
    db.notificationDelivery.updateMany.mockResolvedValue({ count: 0 });

    await notify(input);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("schedules a retry when the channel fails", async () => {
    vi.mocked(sendEmail).mockResolvedValue(false);

    await notify(input);

    expect(db.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { nextAttemptAt: new Date("2026-09-30T12:05:00.000Z") },
    });
  });

  it("gives up after the last attempt", async () => {
    vi.mocked(sendEmail).mockResolvedValue(false);
    db.notificationDelivery.findUnique.mockResolvedValue(claimed(5) as never);

    await notify(input);

    expect(db.notificationDelivery.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { status: "failed" } });
  });

  it("retries due deliveries from the cron", async () => {
    db.notificationDelivery.findMany.mockResolvedValue([{ id: "d1" }, { id: "d2" }] as never);

    expect(await deliverPending()).toEqual({ processed: 2 });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
