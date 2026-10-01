import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasBearerSecret, internalError, unauthorized } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_RETENTION_DAYS = 90;

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return unauthorized();

  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const retentionStart = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * DAY_MS);

    const [usage, authAttempts, sessions, verifications, notifications, usersWithoutConsent] = await Promise.all([
      prisma.usageLimit.deleteMany({ where: { windowStart: { lt: dayAgo } } }),
      prisma.rateLimit.deleteMany({ where: { lastRequest: { lt: BigInt(dayAgo.getTime()) } } }),
      prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.notification.deleteMany({ where: { createdAt: { lt: retentionStart } } }),
      prisma.user.count({ where: { consents: { none: {} }, createdAt: { lt: dayAgo } } }),
    ]);

    const deleted = {
      usageLimits: usage.count,
      authRateLimits: authAttempts.count,
      sessions: sessions.count,
      verifications: verifications.count,
      notifications: notifications.count,
    };
    logger.info(deleted, "cron.cleanup");
    if (usersWithoutConsent > 0) logger.warn({ count: usersWithoutConsent }, "legal.users_without_consent");

    return NextResponse.json({ deleted, usersWithoutConsent });
  } catch (error) {
    return internalError(req, error, "Error running cleanup");
  }
}
