import { describe, expect, it } from "vitest";
import type { RecordCookieConsentInput } from "../../../../schemas/cookie-consent-api.schema";
import { USER_AGENT_MAX_LENGTH } from "../../../domain/entities/cookie-consent.entity";
import { RecordCookieConsentUseCase } from "../record-cookie-consent.use-case";
import { fakeRepository } from "./fake-cookie-consent.repository";

const VISITOR = "6f1c2a7e-9b3d-4c5e-8f60-718293a4b5c6";

const input: RecordCookieConsentInput = {
  visitorId: VISITOR,
  granted: ["analytics"],
  policyVersion: "2026-09-26",
  source: "banner",
};

describe("RecordCookieConsentUseCase", () => {
  it("guarda la respuesta de un visitante anónimo sin reclamar filas", async () => {
    const repository = fakeRepository();
    const consent = await new RecordCookieConsentUseCase(repository).execute(null, input, { userAgent: "Safari" });

    expect(repository.insert).toHaveBeenCalledWith({ ...input, userId: null, userAgent: "Safari" });
    expect(repository.claimVisitor).not.toHaveBeenCalled();
    expect(consent).toMatchObject({ id: "consent-1", granted: ["analytics"] });
  });

  it("con sesión, une a la cuenta las respuestas anteriores del dispositivo", async () => {
    const repository = fakeRepository();
    await new RecordCookieConsentUseCase(repository).execute("user-1", input, { userAgent: null });

    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", userAgent: null }));
    expect(repository.claimVisitor).toHaveBeenCalledWith(VISITOR, "user-1");
  });

  it("recorta el user agent y guarda null si viene vacío", async () => {
    const repository = fakeRepository();
    const useCase = new RecordCookieConsentUseCase(repository);

    await useCase.execute(null, input, { userAgent: "x".repeat(USER_AGENT_MAX_LENGTH + 50) });
    await useCase.execute(null, input, { userAgent: "" });

    expect(repository.insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userAgent: "x".repeat(USER_AGENT_MAX_LENGTH) }),
    );
    expect(repository.insert).toHaveBeenNthCalledWith(2, expect.objectContaining({ userAgent: null }));
  });
});
