import prisma from "@/lib/prisma";
import type { DeliveryOutcome } from "../../../domain/entities/notification.entity";
import type { DeliveryRepository } from "../../../domain/repositories/delivery.repository";
import { CLAIMED_DELIVERY_SELECT, toClaimedDelivery } from "./notification.mapper";

export class PrismaDeliveryRepository implements DeliveryRepository {
  async claim(id: string, now: Date, leaseUntil: Date) {
    const { count } = await prisma.notificationDelivery.updateMany({
      where: { id, status: "pending", nextAttemptAt: { lte: now } },
      data: { attempts: { increment: 1 }, nextAttemptAt: leaseUntil },
    });
    if (count === 0) return null;

    const row = await prisma.notificationDelivery.findUnique({ where: { id }, select: CLAIMED_DELIVERY_SELECT });
    if (!row) return null;

    return toClaimedDelivery(row);
  }

  async saveOutcome(id: string, outcome: DeliveryOutcome) {
    await prisma.notificationDelivery.update({ where: { id }, data: outcome });
  }

  async findDueIds(now: Date, limit: number) {
    const rows = await prisma.notificationDelivery.findMany({
      where: { status: "pending", nextAttemptAt: { lte: now } },
      select: { id: true },
      orderBy: { nextAttemptAt: "asc" },
      take: limit,
    });
    return rows.map(({ id }) => id);
  }
}
