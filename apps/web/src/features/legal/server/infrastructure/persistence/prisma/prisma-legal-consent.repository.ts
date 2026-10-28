import prisma from "@/lib/prisma";
import type { LegalConsent } from "../../../domain/entities/legal-consent.entity";
import type { LegalConsentRepository } from "../../../domain/repositories/legal-consent.repository";

export class PrismaLegalConsentRepository implements LegalConsentRepository {
  async recordAccepted(consents: LegalConsent[]) {
    await prisma.userConsent.createMany({ data: consents, skipDuplicates: true });
  }
}
