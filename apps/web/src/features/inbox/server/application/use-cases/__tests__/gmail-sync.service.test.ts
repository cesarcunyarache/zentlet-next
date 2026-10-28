import { describe, expect, it, vi } from "vitest";
import type { GmailMessage } from "../../../../lib/gmail-message";
import type { EmailIngestionService } from "../../services/email-ingestion.service";
import { GmailAccessService } from "../../services/gmail-access.service";
import { GmailSyncService } from "../../services/gmail-sync.service";
import { RenewGmailWatchesUseCase } from "../renew-gmail-watches.use-case";
import {
  fakeCipher,
  fakeGmailGateway,
  fakeGmailRepository,
  fakeMonitor,
  fakeSenderRepository,
  gmailConnection,
} from "./fake-inbox";
import type { GmailGateway } from "../../../domain/ports/inbox.ports";
import type { GmailConnectionRepository } from "../../../domain/repositories/gmail-connection.repository";

const BANK = "BCP <notificaciones@notificacionesbcp.com.pe>";

const metadataFrom = (from: string): GmailMessage => ({ id: "m1", payload: { headers: [{ name: "From", value: from }] } });

function syncService(repository: GmailConnectionRepository, gateway: GmailGateway) {
  const monitor = fakeMonitor();
  const ingestion = { ingest: vi.fn().mockResolvedValue("created") } as unknown as EmailIngestionService;
  const access = new GmailAccessService(repository, gateway, fakeCipher, monitor);
  const sync = new GmailSyncService(repository, fakeSenderRepository(), gateway, access, ingestion, monitor);
  return { sync, access, ingestion, monitor };
}

const withNewMessage = (overrides: Partial<GmailGateway> = {}) =>
  fakeGmailGateway({
    listHistory: vi.fn().mockResolvedValue({
      historyId: "1100",
      history: [{ messagesAdded: [{ message: { id: "m1", labelIds: ["INBOX"] } }] }],
    }),
    getMessageSender: vi.fn().mockResolvedValue(metadataFrom(BANK)),
    getMessage: vi.fn().mockResolvedValue(metadataFrom(BANK)),
    ...overrides,
  });

describe("GmailSyncService", () => {
  it("ingiere los correos nuevos de bancos conocidos y guarda el avance", async () => {
    const repository = fakeGmailRepository();
    const { sync, ingestion } = syncService(repository, withNewMessage());

    expect(await sync.sync(gmailConnection())).toBe("synced");
    expect(ingestion.ingest).toHaveBeenCalledTimes(1);
    expect(repository.saveProgress).toHaveBeenCalledWith("gmail-1", BigInt(1100));
  });

  it("ignora remitentes que no vigila", async () => {
    const gateway = withNewMessage({ getMessageSender: vi.fn().mockResolvedValue(metadataFrom("promo@shop.pe")) });
    const { sync, ingestion } = syncService(fakeGmailRepository(), gateway);

    await sync.sync(gmailConnection());

    expect(gateway.getMessage).not.toHaveBeenCalled();
    expect(ingestion.ingest).not.toHaveBeenCalled();
  });

  it("un historial vencido reinicia desde el perfil", async () => {
    const repository = fakeGmailRepository();
    const gateway = fakeGmailGateway({ listHistory: vi.fn().mockResolvedValue("expired") });

    expect(await syncService(repository, gateway).sync.sync(gmailConnection())).toBe("reset");
    expect(repository.saveProgress).toHaveBeenCalledWith("gmail-1", BigInt(900));
  });

  it("sin historial previo reinicia sin leer mensajes", async () => {
    const gateway = fakeGmailGateway();

    expect(await syncService(fakeGmailRepository(), gateway).sync.sync(gmailConnection({ historyId: null }))).toBe("reset");
    expect(gateway.listHistory).not.toHaveBeenCalled();
  });

  it("una conexión revocada no sincroniza", async () => {
    const gateway = fakeGmailGateway();

    expect(await syncService(fakeGmailRepository(), gateway).sync.sync(gmailConnection({ status: "revoked" }))).toBe("revoked");
    expect(gateway.refreshAccessToken).not.toHaveBeenCalled();
  });
});

describe("RenewGmailWatchesUseCase", () => {
  it("cuenta las renovaciones fallidas sin detener el resto", async () => {
    const repository = fakeGmailRepository({
      findActive: vi.fn().mockResolvedValue([gmailConnection({ id: "a" }), gmailConnection({ id: "b" })]),
    });
    const gateway = fakeGmailGateway({
      watch: vi.fn().mockRejectedValueOnce(new Error("quota")).mockResolvedValue({ historyId: BigInt(1), watchExpiresAt: new Date() }),
    });
    const { sync, access, monitor } = syncService(repository, gateway);

    const totals = await new RenewGmailWatchesUseCase(repository, gateway, access, sync, monitor).execute();

    expect(totals).toEqual({ renewed: 1, failed: 1 });
    expect(monitor.error).toHaveBeenCalledWith("inbox.gmail_renew_failed", expect.objectContaining({ userId: "user-1" }));
  });
});
