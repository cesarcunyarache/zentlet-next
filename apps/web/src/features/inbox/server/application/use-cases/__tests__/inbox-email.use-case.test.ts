import { describe, expect, it, vi } from "vitest";
import type { InboundEmail } from "../../../../types";
import type { EmailIngestionService } from "../../services/email-ingestion.service";
import type { GmailSyncService } from "../../services/gmail-sync.service";
import { ReceiveInboundEmailUseCase } from "../receive-inbound-email.use-case";
import { SyncGmailPushUseCase } from "../sync-gmail-push.use-case";
import { fakeEmailInboxRepository, fakeGmailRepository, gmailConnection, USER } from "./fake-inbox";

const inbox = {
  id: "inbox-1",
  userId: USER,
  address: "ana.k3x@in.zentlet.app",
  verificationCode: null,
  verificationUrl: null,
  lastReceivedAt: null,
};

const email = (overrides: Partial<InboundEmail> = {}): InboundEmail => ({
  messageId: "message-1",
  from: "alerts@shop.pe",
  recipients: ["Ana <ANA.k3x@in.zentlet.app>"],
  subject: "Consumo",
  text: "Consumo de S/ 10.00",
  html: "",
  headers: [],
  receivedAt: new Date("2026-09-25T04:55:00.000Z"),
  ...overrides,
});

function setup() {
  const inboxes = fakeEmailInboxRepository({ findByAddresses: vi.fn().mockResolvedValue(inbox) });
  const ingestion = { ingest: vi.fn().mockResolvedValue("created") } as unknown as EmailIngestionService;
  return { inboxes, ingestion, useCase: new ReceiveInboundEmailUseCase(inboxes, ingestion) };
}

describe("ReceiveInboundEmailUseCase", () => {
  it("busca el buzón por las direcciones normalizadas, anota la recepción y procesa el correo", async () => {
    const { useCase, inboxes, ingestion } = setup();

    expect(await useCase.execute(email())).toBe("created");
    expect(inboxes.findByAddresses).toHaveBeenCalledWith(["ana.k3x@in.zentlet.app"]);
    expect(inboxes.recordReceipt).toHaveBeenCalledWith("inbox-1", email().receivedAt, null);
    expect(ingestion.ingest).toHaveBeenCalledWith(USER, email(), "Consumo de S/ 10.00");
  });

  it("un correo para nadie conocido no se procesa", async () => {
    const { useCase, inboxes, ingestion } = setup();
    vi.mocked(inboxes.findByAddresses).mockResolvedValue(null);

    expect(await useCase.execute(email())).toBe("unknown_recipient");
    expect(await useCase.execute(email({ recipients: [] }))).toBe("unknown_recipient");
    expect(ingestion.ingest).not.toHaveBeenCalled();
  });

  it("la confirmación de reenvío de Gmail guarda el código y no se trata como movimiento", async () => {
    const { useCase, inboxes, ingestion } = setup();
    const verification = email({
      from: "Gmail Team <forwarding-noreply@google.com>",
      subject: "(#123456789) Gmail Forwarding Confirmation",
    });

    expect(await useCase.execute(verification)).toBe("verification");
    expect(inboxes.recordReceipt).toHaveBeenCalledWith(
      "inbox-1",
      verification.receivedAt,
      expect.objectContaining({ code: "123456789" }),
    );
    expect(ingestion.ingest).not.toHaveBeenCalled();
  });
});

describe("SyncGmailPushUseCase", () => {
  const sync = () => ({ sync: vi.fn().mockResolvedValue("synced") }) as unknown as GmailSyncService;

  it("sincroniza la conexión activa del correo avisado", async () => {
    const connections = fakeGmailRepository({ findByEmail: vi.fn().mockResolvedValue(gmailConnection()) });
    const gmailSync = sync();

    expect(await new SyncGmailPushUseCase(connections, gmailSync).execute("cesar@gmail.com")).toBe("synced");
    expect(gmailSync.sync).toHaveBeenCalledWith(gmailConnection());
  });

  it("un correo sin conexión o con la conexión revocada es unknown", async () => {
    const gmailSync = sync();
    const missing = fakeGmailRepository();
    const revoked = fakeGmailRepository({
      findByEmail: vi.fn().mockResolvedValue(gmailConnection({ status: "revoked" })),
    });

    expect(await new SyncGmailPushUseCase(missing, gmailSync).execute("x@gmail.com")).toBe("unknown");
    expect(await new SyncGmailPushUseCase(revoked, gmailSync).execute("cesar@gmail.com")).toBe("unknown");
    expect(gmailSync.sync).not.toHaveBeenCalled();
  });
});
