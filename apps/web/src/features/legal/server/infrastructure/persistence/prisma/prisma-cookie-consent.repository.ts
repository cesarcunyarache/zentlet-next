import prisma from "@/lib/prisma";
import type { NewCookieConsent } from "../../../domain/entities/cookie-consent.entity";
import type { CookieConsentRepository } from "../../../domain/repositories/cookie-consent.repository";
import { toDomain } from "./cookie-consent.mapper";

export class PrismaCookieConsentRepository implements CookieConsentRepository {
  async insert(consent: NewCookieConsent) {
    return toDomain(await prisma.userCookieConsent.create({ data: consent }));
  }

  async claimVisitor(visitorId: string, userId: string) {
    await prisma.userCookieConsent.updateMany({ where: { visitorId, userId: null }, data: { userId } });
  }

  async findLatestForUser(userId: string) {
    const row = await prisma.userCookieConsent.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    return row ? toDomain(row) : null;
  }
}
