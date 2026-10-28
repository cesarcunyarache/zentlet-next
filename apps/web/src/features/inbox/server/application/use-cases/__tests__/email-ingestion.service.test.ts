import { describe, expect, it, vi } from "vitest";
import type { InboundEmail } from "../../../../types";
import { EmailIngestionService } from "../../services/email-ingestion.service";
import { fakeItemRepository, fakeSenderRepository, sender, USER } from "./fake-inbox";

const BCP_BODY = `Realizaste un consumo de S/ 14.50 con tu Tarjeta de Débito BCP en IKF A53 PIURA 21.
Total del consumo\tS/ 14.50
Fecha y hora\t24 de setiembre de 2026 - 06:54 PM
Número de operación\t576278`;

const email = (overrides: Partial<InboundEmail> = {}): InboundEmail => ({
  messageId: "message-1",
  from: "BCP <notificaciones@notificacionesbcp.com.pe>",
  recipients: [],
  subject: "Constancia de consumo",
  text: BCP_BODY,
  html: "",
  headers: [],
  receivedAt: new Date("2026-09-25T04:55:00.000Z"),
  ...overrides,
});

const calendar = { localDate: vi.fn().mockResolvedValue("2026-09-25") };
const noRules = { find: vi.fn().mockResolvedValue(null) };

describe("EmailIngestionService", () => {
  it("guarda el movimiento leído con la categoría aprendida del comercio", async () => {
    const items = fakeItemRepository();
    const rules = { find: vi.fn().mockResolvedValue({ categoryId: "food", description: "Almuerzo" }) };

    const outcome = await new EmailIngestionService(items, fakeSenderRepository(), rules, calendar).ingest(USER, email());

    expect(outcome).toBe("created");
    expect(items.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER,
        bank: "BCP",
        amount: 14.5,
        categoryId: "food",
        description: "Almuerzo",
        isLearned: true,
        transactionDate: new Date("2026-09-24"),
        reference: "576278",
      }),
    );
  });

  it("un remitente bloqueado no se procesa", async () => {
    const items = fakeItemRepository();
    const blocked = sender({ address: "notificaciones@notificacionesbcp.com.pe", status: "blocked" });
    const senders = fakeSenderRepository({ findRules: vi.fn().mockResolvedValue([blocked]) });

    expect(await new EmailIngestionService(items, senders, noRules, calendar).ingest(USER, email())).toBe("blocked");
    expect(items.insert).not.toHaveBeenCalled();
  });

  it("un correo que no describe un movimiento se ignora", async () => {
    const items = fakeItemRepository();

    const outcome = await new EmailIngestionService(items, fakeSenderRepository(), noRules, calendar).ingest(
      USER,
      email({ text: "Hola, tenemos ofertas para ti" }),
    );

    expect(outcome).toBe("ignored");
  });

  it("la misma operación ya recibida es duplicate", async () => {
    const items = fakeItemRepository({ hasReference: vi.fn().mockResolvedValue(true) });

    expect(await new EmailIngestionService(items, fakeSenderRepository(), noRules, calendar).ingest(USER, email())).toBe(
      "duplicate",
    );
    expect(items.insert).not.toHaveBeenCalled();
  });

  it("busca un movimiento parecido un día antes y después", async () => {
    const items = fakeItemRepository();

    await new EmailIngestionService(items, fakeSenderRepository(), noRules, calendar).ingest(USER, email());

    expect(items.findSimilarTransactionId).toHaveBeenCalledWith(USER, expect.objectContaining({ amount: 14.5 }), {
      from: new Date("2026-09-23"),
      to: new Date("2026-09-25"),
    });
  });
});
