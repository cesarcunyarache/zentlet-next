import { describe, expect, it, vi } from "vitest";
import { SyncCookieConsentUseCase } from "../sync-cookie-consent.use-case";
import { fakeRepository, stored } from "./fake-cookie-consent.repository";

const VISITOR = "6f1c2a7e-9b3d-4c5e-8f60-718293a4b5c6";

describe("SyncCookieConsentUseCase", () => {
  it("reclama el dispositivo antes de leer la última respuesta de la cuenta", async () => {
    const latest = stored({
      visitorId: "otro-dispositivo",
      userId: "user-1",
      granted: [],
      policyVersion: "2026-09-26",
      source: "settings",
      userAgent: null,
    });
    const order: string[] = [];
    const repository = fakeRepository({
      claimVisitor: vi.fn(async () => {
        order.push("claim");
      }),
      findLatestForUser: vi.fn(async () => {
        order.push("find");
        return latest;
      }),
    });

    const result = await new SyncCookieConsentUseCase(repository).execute("user-1", { visitorId: VISITOR });

    expect(repository.claimVisitor).toHaveBeenCalledWith(VISITOR, "user-1");
    expect(order).toEqual(["claim", "find"]);
    expect(result).toBe(latest);
  });

  it("devuelve null si la cuenta nunca respondió", async () => {
    const result = await new SyncCookieConsentUseCase(fakeRepository()).execute("user-1", { visitorId: VISITOR });
    expect(result).toBeNull();
  });
});
