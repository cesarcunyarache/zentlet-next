import prisma from "@/lib/prisma";
import type { RetentionRepository } from "../../../domain/repositories/retention.repository";

const countOf = async (deletion: Promise<{ count: number }>) => (await deletion).count;

export class PrismaRetentionRepository implements RetentionRepository {
  deleteUsageLimitsBefore(date: Date) {
    return countOf(prisma.usageLimit.deleteMany({ where: { windowStart: { lt: date } } }));
  }

  deleteAuthRateLimitsBefore(date: Date) {
    return countOf(prisma.rateLimit.deleteMany({ where: { lastRequest: { lt: BigInt(date.getTime()) } } }));
  }

  deleteSessionsExpiredBy(date: Date) {
    return countOf(prisma.session.deleteMany({ where: { expiresAt: { lt: date } } }));
  }

  deleteVerificationsExpiredBy(date: Date) {
    return countOf(prisma.verification.deleteMany({ where: { expiresAt: { lt: date } } }));
  }

  deleteNotificationsBefore(date: Date) {
    return countOf(prisma.notification.deleteMany({ where: { createdAt: { lt: date } } }));
  }

  deleteInboxItemsResolvedBefore(date: Date) {
    return countOf(
      prisma.inboxTransaction.deleteMany({ where: { status: { not: "pending" }, resolvedAt: { lt: date } } }),
    );
  }

  deleteWhatsappMessagesBefore(date: Date) {
    return countOf(prisma.whatsappMessage.deleteMany({ where: { receivedAt: { lt: date } } }));
  }

  deleteWhatsappLinkCodesExpiredBy(date: Date) {
    return countOf(prisma.whatsappLinkCode.deleteMany({ where: { expiresAt: { lt: date } } }));
  }

  countUsersWithoutConsentCreatedBefore(date: Date) {
    return prisma.user.count({ where: { consents: { none: {} }, createdAt: { lt: date } } });
  }
}
