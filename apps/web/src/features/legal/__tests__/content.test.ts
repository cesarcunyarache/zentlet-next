import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { LEGAL_DOCUMENTS } from "../config";
import { legalDocuments } from "../content";

describe("legalDocuments", () => {
  it("tiene un texto por cada documento que se acepta al registrarse", () => {
    expect(Object.keys(legalDocuments).sort()).toEqual([...LEGAL_DOCUMENTS].sort());
  });

  it("traduce cada documento a todos los idiomas", () => {
    for (const byLocale of Object.values(legalDocuments)) {
      for (const locale of routing.locales) {
        const document = byLocale[locale];
        expect(document.title).toBeTruthy();
        expect(document.sections.length).toBeGreaterThan(0);
      }
    }
  });
});
