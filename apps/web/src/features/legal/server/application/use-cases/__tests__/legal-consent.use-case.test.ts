import { describe, expect, it, vi } from "vitest";
import { LEGAL_DOCUMENTS, LEGAL_VERSION, type LegalDocumentId } from "../../../../config";
import { legalDocumentSchema } from "../../../../schemas/legal-consent.schema";
import type { SignUpRollback } from "../../../domain/ports/legal.ports";
import type { LegalConsentRepository } from "../../../domain/repositories/legal-consent.repository";
import { RecordLegalConsentUseCase } from "../record-legal-consent.use-case";
import { RecordSignUpConsentUseCase } from "../record-sign-up-consent.use-case";

function setup() {
  const repository: LegalConsentRepository = { recordAccepted: vi.fn().mockResolvedValue(undefined) };
  const rollback: SignUpRollback = { undo: vi.fn().mockResolvedValue(undefined) };
  const recordLegalConsent = new RecordLegalConsentUseCase(repository);
  const recordSignUpConsent = new RecordSignUpConsentUseCase(recordLegalConsent, rollback);
  return { repository, rollback, recordLegalConsent, recordSignUpConsent };
}

describe("legalDocumentSchema", () => {
  it("admite sólo los textos declarados", () => {
    expect(LEGAL_DOCUMENTS).toEqual(["terms", "privacy"]);
    expect(legalDocumentSchema.safeParse("terms").success).toBe(true);
    expect(legalDocumentSchema.safeParse("marketing").success).toBe(false);
  });
});

describe("RecordLegalConsentUseCase", () => {
  it("guarda una fila por texto con la versión vigente", async () => {
    const { repository, recordLegalConsent } = setup();

    await recordLegalConsent.execute("user-1");

    expect(repository.recordAccepted).toHaveBeenCalledWith([
      { userId: "user-1", document: "terms", version: LEGAL_VERSION },
      { userId: "user-1", document: "privacy", version: LEGAL_VERSION },
    ]);
  });

  it("acepta un texto y una versión concretos", async () => {
    const { repository, recordLegalConsent } = setup();

    await recordLegalConsent.execute("user-1", ["privacy"], "2027-01-01");

    expect(repository.recordAccepted).toHaveBeenCalledWith([
      { userId: "user-1", document: "privacy", version: "2027-01-01" },
    ]);
  });

  it("rechaza un texto desconocido o una lista vacía sin escribir", async () => {
    const { repository, recordLegalConsent } = setup();

    await expect(recordLegalConsent.execute("user-1", ["marketing" as LegalDocumentId])).rejects.toThrow();
    await expect(recordLegalConsent.execute("user-1", [])).rejects.toThrow();
    expect(repository.recordAccepted).not.toHaveBeenCalled();
  });
});

describe("RecordSignUpConsentUseCase", () => {
  it("guarda el consentimiento y conserva la cuenta", async () => {
    const { repository, rollback, recordSignUpConsent } = setup();

    await recordSignUpConsent.execute("user-1");

    expect(repository.recordAccepted).toHaveBeenCalledOnce();
    expect(rollback.undo).not.toHaveBeenCalled();
  });

  it("si no se puede guardar, deshace el alta y propaga el error", async () => {
    const { repository, rollback, recordSignUpConsent } = setup();
    const failure = new Error("db down");
    vi.mocked(repository.recordAccepted).mockRejectedValue(failure);

    await expect(recordSignUpConsent.execute("user-1")).rejects.toBe(failure);
    expect(rollback.undo).toHaveBeenCalledWith("user-1");
  });

  it("propaga el error original aunque también falle el borrado", async () => {
    const { repository, rollback, recordSignUpConsent } = setup();
    const failure = new Error("db down");
    vi.mocked(repository.recordAccepted).mockRejectedValue(failure);
    vi.mocked(rollback.undo).mockRejectedValue(new Error("delete failed"));

    await expect(recordSignUpConsent.execute("user-1")).rejects.toBe(failure);
  });
});
