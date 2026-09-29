import { z } from "zod";
import prisma from "@/lib/prisma";
import { LEGAL_DOCUMENTS, LEGAL_VERSION } from "./config";

export { LEGAL_DOCUMENTS };

export const legalDocumentSchema = z.enum(LEGAL_DOCUMENTS);

export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export async function recordLegalConsent(
  userId: string,
  documents: readonly LegalDocument[] = LEGAL_DOCUMENTS,
  version: string = LEGAL_VERSION,
) {
  const accepted = z.array(legalDocumentSchema).min(1).parse(documents);
  await prisma.userConsent.createMany({
    data: accepted.map((document) => ({ userId, document, version })),
    skipDuplicates: true,
  });
}

export async function recordSignUpConsent(userId: string) {
  try {
    await recordLegalConsent(userId);
  } catch (error) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    throw error;
  }
}
