import { describe, expect, it } from "vitest";
import type { UserCookieConsent } from "@/generated/prisma/client";
import { toDomain } from "../cookie-consent.mapper";

const row: UserCookieConsent = {
  id: "consent-1",
  visitorId: "6f1c2a7e-9b3d-4c5e-8f60-718293a4b5c6",
  userId: null,
  granted: ["analytics"],
  policyVersion: "2026-09-26",
  source: "banner",
  userAgent: "Safari",
  createdAt: new Date("2026-10-16T12:00:00Z"),
};

describe("toDomain", () => {
  it("copia la fila tal cual cuando es válida", () => {
    expect(toDomain(row)).toEqual(row);
  });

  it("descarta categorías y orígenes que el código ya no conoce", () => {
    expect(toDomain({ ...row, granted: ["analytics", "marketing"], source: "legacy" })).toMatchObject({
      granted: ["analytics"],
      source: "banner",
    });
  });
});
