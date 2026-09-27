import { z } from "zod";
import prisma from "@/lib/prisma";
import { LEGAL_VERSION } from "./config";

/** Textos que se aceptan al registrarse. Se guardan como texto: añadir uno no requiere migración. */
export const LEGAL_DOCUMENTS = ["terms", "privacy"] as const;

export const legalDocumentSchema = z.enum(LEGAL_DOCUMENTS);

export type LegalDocument = z.infer<typeof legalDocumentSchema>;

/**
 * Prueba del consentimiento: una fila por texto y versión, nunca se
 * sobrescribe. Aceptar de nuevo la misma versión no duplica filas.
 */
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

/**
 * Una cuenta no puede existir sin la prueba de su consentimiento: si no se
 * pudo guardar, se deshace el alta y el registro falla.
 */
export async function recordSignUpConsent(userId: string) {
  try {
    await recordLegalConsent(userId);
  } catch (error) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    throw error;
  }
}
