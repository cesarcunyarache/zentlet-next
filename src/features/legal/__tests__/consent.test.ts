import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { LEGAL_DOCUMENTS, LEGAL_VERSION } from "../config";
import { legalDocumentSchema, recordLegalConsent, recordSignUpConsent, type LegalDocument } from "../consent";

vi.mock("@/lib/prisma", () => ({
  default: { userConsent: { createMany: vi.fn() }, user: { delete: vi.fn() } },
}));

const db = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.resetAllMocks();
  db.userConsent.createMany.mockResolvedValue({ count: 2 });
  db.user.delete.mockResolvedValue({} as never);
});

describe("legalDocumentSchema", () => {
  it("admite sólo los textos declarados", () => {
    expect(LEGAL_DOCUMENTS).toEqual(["terms", "privacy"]);
    expect(legalDocumentSchema.safeParse("terms").success).toBe(true);
    expect(legalDocumentSchema.safeParse("marketing").success).toBe(false);
  });
});

describe("recordLegalConsent", () => {
  it("guarda una fila por texto con la versión vigente, sin duplicar", async () => {
    await recordLegalConsent("user-1");
    expect(db.userConsent.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", document: "terms", version: LEGAL_VERSION },
        { userId: "user-1", document: "privacy", version: LEGAL_VERSION },
      ],
      skipDuplicates: true,
    });
  });

  it("acepta un texto y una versión concretos", async () => {
    await recordLegalConsent("user-1", ["privacy"], "2027-01-01");
    expect(db.userConsent.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", document: "privacy", version: "2027-01-01" }],
      skipDuplicates: true,
    });
  });

  it("rechaza un texto desconocido o una lista vacía sin escribir", async () => {
    await expect(recordLegalConsent("user-1", ["marketing" as LegalDocument])).rejects.toThrow();
    await expect(recordLegalConsent("user-1", [])).rejects.toThrow();
    expect(db.userConsent.createMany).not.toHaveBeenCalled();
  });
});

describe("recordSignUpConsent", () => {
  it("guarda el consentimiento y conserva la cuenta", async () => {
    await recordSignUpConsent("user-1");
    expect(db.userConsent.createMany).toHaveBeenCalledOnce();
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it("si no se puede guardar, deshace el alta y propaga el error", async () => {
    const failure = new Error("db down");
    db.userConsent.createMany.mockRejectedValue(failure);
    await expect(recordSignUpConsent("user-1")).rejects.toBe(failure);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("propaga el error original aunque también falle el borrado", async () => {
    const failure = new Error("db down");
    db.userConsent.createMany.mockRejectedValue(failure);
    db.user.delete.mockRejectedValue(new Error("delete failed"));
    await expect(recordSignUpConsent("user-1")).rejects.toBe(failure);
  });
});
