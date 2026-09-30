import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, hasBearerSecret, internalError } from "@/lib/api/route-helpers";
import { logger } from "@/lib/observability/logger";

/*
 * Limpieza diaria (Vercel Cron, ver vercel.json). Borra lo que ya no sirve
 * y crecería sin límite: contadores de uso con la ventana vencida (la más
 * larga es de 1 h), contadores de intentos de Better Auth, sesiones y
 * enlaces de verificación caducados. Además avisa si hay cuentas sin el
 * consentimiento legal registrado (el alta lo guarda en un paso aparte).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  if (!hasBearerSecret(req, process.env.CRON_SECRET)) return errorResponse("Unauthorized", 401);

  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - DAY_MS);

    const [usage, authAttempts, sessions, verifications, usersWithoutConsent] = await Promise.all([
      prisma.usageLimit.deleteMany({ where: { windowStart: { lt: dayAgo } } }),
      prisma.rateLimit.deleteMany({ where: { lastRequest: { lt: BigInt(dayAgo.getTime()) } } }),
      prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.user.count({ where: { consents: { none: {} }, createdAt: { lt: dayAgo } } }),
    ]);

    const deleted = {
      usageLimits: usage.count,
      authRateLimits: authAttempts.count,
      sessions: sessions.count,
      verifications: verifications.count,
    };
    logger.info(deleted, "cron.cleanup");
    if (usersWithoutConsent > 0) logger.warn({ count: usersWithoutConsent }, "legal.users_without_consent");

    return NextResponse.json({ deleted, usersWithoutConsent });
  } catch (error) {
    return internalError(req, error, "Error running cleanup");
  }
}
