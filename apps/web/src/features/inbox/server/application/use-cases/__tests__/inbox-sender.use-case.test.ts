import { describe, expect, it, vi } from "vitest";
import { RemoveInboxSenderUseCase } from "../remove-inbox-sender.use-case";
import { StartGmailConnectUseCase } from "../start-gmail-connect.use-case";
import { TrustInboxSenderUseCase } from "../trust-inbox-sender.use-case";
import { fakeGmailGateway, fakeSenderRepository, sender, USER } from "./fake-inbox";

describe("TrustInboxSenderUseCase", () => {
  it("confía en una dirección o en un dominio completo, normalizados", async () => {
    const senders = fakeSenderRepository({ trust: vi.fn().mockResolvedValue(sender({ origin: "manual" })) });
    const useCase = new TrustInboxSenderUseCase(senders);

    await useCase.execute(USER, "  Alerts@Shop.PE ");
    await useCase.execute(USER, "shop.pe");

    expect(senders.trust).toHaveBeenNthCalledWith(1, USER, "alerts@shop.pe");
    expect(senders.trust).toHaveBeenNthCalledWith(2, USER, "@shop.pe");
  });

  it("algo que no es un correo ni un dominio es invalid_sender", async () => {
    const senders = fakeSenderRepository();

    expect(await new TrustInboxSenderUseCase(senders).execute(USER, "no es correo")).toEqual({ error: "invalid_sender" });
    expect(senders.trust).not.toHaveBeenCalled();
  });
});

describe("RemoveInboxSenderUseCase", () => {
  it("quitar un remitente ajeno o inexistente es sender_not_found", async () => {
    const senders = fakeSenderRepository({ deleteOwned: vi.fn().mockResolvedValue("not_found") });

    expect(await new RemoveInboxSenderUseCase(senders).execute(USER, "sender-1")).toEqual({ error: "sender_not_found" });
  });

  it("quita el remitente del usuario", async () => {
    expect(await new RemoveInboxSenderUseCase(fakeSenderRepository()).execute(USER, "sender-1")).toEqual({ ok: true });
  });
});

describe("StartGmailConnectUseCase", () => {
  it("sin Gmail configurado no hay URL", () => {
    const gateway = fakeGmailGateway({ isAvailable: vi.fn().mockReturnValue(false) });
    expect(new StartGmailConnectUseCase(gateway).execute()).toBeNull();
  });

  it("genera un state aleatorio distinto en cada intento y lo incluye en la URL", () => {
    const useCase = new StartGmailConnectUseCase(fakeGmailGateway());

    const first = useCase.execute();
    const second = useCase.execute();

    expect(first?.state).toMatch(/^[\w-]{32}$/);
    expect(first?.url).toContain(`state=${first?.state}`);
    expect(first?.state).not.toBe(second?.state);
  });
});
