import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET as listInbox } from "@/app/api/inbox/route";
import { POST as acceptRoute } from "@/app/api/inbox/[id]/accept/route";
import { POST as dismissRoute } from "@/app/api/inbox/[id]/dismiss/route";
import { GET as getConnection, POST as createConnection } from "@/app/api/inbox/connection/route";
import { POST as webhookRoute } from "@/app/api/inbox/email/[provider]/route";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { createUser, resetDatabase } from "@/test/integration/database";
import type { TInboxConnection, TInboxItem } from "../types";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/features/budget/server/check", () => ({ scheduleBudgetCheck: vi.fn() }));

const getSession = vi.mocked(auth.api.getSession);
const BASE_URL = "http://localhost";
const SECRET = "inbound-secret";
const BCP = "BCP <notificaciones@notificacionesbcp.com.pe>";

const bcpBody = (merchant: string, amount: string, operation: string) => `Hola Cesar Efrain,
Realizaste un consumo de S/ ${amount} con tu Tarjeta de Débito BCP en ${merchant}.
Total del consumo\tS/ ${amount}
Operación realizada\tConsumo Tarjeta de Débito
Fecha y hora\t24 de setiembre de 2026 - 06:54 PM
Número de Tarjeta de Débito\t************6973
Empresa\t${merchant}
Número de operación\t${operation}`;

let userId: string;
let address: string;
let messageSequence = 0;

const signIn = (id: string) => getSession.mockResolvedValue({ user: { id } } as never);
const post = (path: string, init: RequestInit = {}) => new Request(`${BASE_URL}${path}`, { method: "POST", ...init });
const params = <T>(value: T) => ({ params: Promise.resolve(value) });

function receive(from: string, body: string, options: { subject?: string; messageId?: string; secret?: string } = {}) {
  return webhookRoute(
    post("/api/inbox/email/postmark", {
      headers: { authorization: `Bearer ${options.secret ?? SECRET}` },
      body: JSON.stringify({
        MessageID: options.messageId ?? `message-${++messageSequence}`,
        From: from,
        OriginalRecipient: address,
        ToFull: [{ Email: "cesar@gmail.com" }],
        Subject: options.subject ?? "Constancia de consumo",
        TextBody: body,
        Date: "Wed, 24 Sep 2026 23:55:00 -0500",
        Headers: [{ Name: "ARC-Authentication-Results", Value: "i=1; dkim=pass header.i=@notificacionesbcp.com.pe" }],
      }),
    }),
    params({ provider: "postmark" }),
  );
}

const outcome = async (response: Response) => ((await response.json()) as { outcome: string }).outcome;
const pending = async () => (await (await listInbox(new Request(`${BASE_URL}/api/inbox`))).json()) as TInboxItem[];
const accept = (id: string, values: object) =>
  acceptRoute(post(`/api/inbox/${id}/accept`, { body: JSON.stringify(values) }), params({ id }));
const dismiss = (id: string) => dismissRoute(post(`/api/inbox/${id}/dismiss`), params({ id }));

async function makePro(id: string) {
  await prisma.subscription.create({
    data: { userId: id, planKey: "pro", status: "active", amount: 1490, currency: "PEN", interval: "month", provider: "mercadopago" },
  });
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv("INBOUND_EMAIL_SECRET", SECRET);
  vi.stubEnv("INBOUND_EMAIL_DOMAIN", "in.zentlet.test");
  await resetDatabase();
  userId = (await createUser()).id;
  signIn(userId);
  await makePro(userId);
  const created = (await (await createConnection(post("/api/inbox/connection"))).json()) as TInboxConnection;
  address = created.address!;
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe("movimientos por correo", () => {
  it("es parte de Pro", async () => {
    const free = await createUser();
    signIn(free.id);
    expect((await createConnection(post("/api/inbox/connection"))).status).toBe(403);
    expect((await listInbox(new Request(`${BASE_URL}/api/inbox`))).status).toBe(403);
  });

  it("da una dirección única y estable", async () => {
    expect(address).toMatch(/^[a-z2-9]{12}@in\.zentlet\.test$/);
    const again = (await (await createConnection(post("/api/inbox/connection"))).json()) as TInboxConnection;
    expect(again.address).toBe(address);
  });

  it("rechaza el webhook sin secreto", async () => {
    expect((await receive(BCP, bcpBody("IKF A53 PIURA 21", "14.50", "1"), { secret: "otro" })).status).toBe(401);
  });

  it("muestra el código de confirmación de reenvío de Gmail", async () => {
    await receive("forwarding-noreply@google.com", "Haz clic en https://mail-settings.google.com/mail/vf-abc123", {
      subject: "(#987654321) Confirmación de reenvío de Gmail",
    });
    const connection = (await (await getConnection(new Request(`${BASE_URL}/api/inbox/connection`))).json()) as TInboxConnection;
    expect(connection).toMatchObject({
      verificationCode: "987654321",
      verificationUrl: "https://mail-settings.google.com/mail/vf-abc123",
    });
    expect(await pending()).toHaveLength(0);
  });

  it("un aviso del BCP queda por confirmar, al aceptarlo se registra y la próxima vez se recuerda", async () => {
    const food = await prisma.category.create({ data: { userId, name: "Comida", icon: "🍜", color: "#FDDCC4" } });

    expect(await outcome(await receive(BCP, bcpBody("IKF A53 PIURA 21", "14.50", "576278")))).toBe("created");
    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);

    const [item] = await pending();
    expect(item).toMatchObject({
      bank: "BCP",
      amount: 14.5,
      currency: "PEN",
      merchant: "Ikf A53 Piura 21",
      transactionDate: "2026-09-24",
      cardLast4: "6973",
      isVerified: true,
      isNewSender: false,
      isLearned: false,
    });

    const accepted = await accept(item.id, {
      type: "expense",
      amount: 14.5,
      categoryId: food.id,
      description: "KFC",
      transactionDate: item.transactionDate,
    });
    expect(accepted.status).toBe(201);
    expect(scheduleBudgetCheck).toHaveBeenCalledWith(userId, food.id);
    expect(await pending()).toHaveLength(0);
    expect(await prisma.transaction.findFirst({ where: { userId } })).toMatchObject({
      description: "KFC",
      categoryId: food.id,
      reference: "576278",
    });

    await receive(BCP, bcpBody("IKF B12 PIURA 05", "32.00", "576999"));
    expect((await pending())[0]).toMatchObject({ description: "KFC", categoryId: food.id, isLearned: true });
  });

  it("no repite el mismo correo ni la misma operación reenviada dos veces", async () => {
    const body = bcpBody("IKF A53 PIURA 21", "14.50", "576278");
    expect(await outcome(await receive(BCP, body, { messageId: "same" }))).toBe("created");
    expect(await outcome(await receive(BCP, body, { messageId: "same" }))).toBe("duplicate");
    expect(await outcome(await receive(BCP, body))).toBe("duplicate");
    expect(await pending()).toHaveLength(1);
  });

  it("marca como posible duplicado lo que ya registraste a mano", async () => {
    const food = await prisma.category.create({ data: { userId, name: "Comida", icon: "🍜", color: "#FDDCC4" } });
    const manual = await prisma.transaction.create({
      data: { userId, type: "expense", amount: 14.5, categoryId: food.id, description: "KFC", transactionDate: new Date("2026-09-25") },
    });
    await receive(BCP, bcpBody("IKF A53 PIURA 21", "14.50", "1"));
    expect((await pending())[0].duplicateOfId).toBe(manual.id);
  });

  it("aprende a ignorar un remitente que siempre se descarta", async () => {
    const promo = "Ofertas <promo@tienda.pe>";
    for (const amount of ["29.90", "39.90", "49.90"]) {
      expect(await outcome(await receive(promo, `Llévalo desde S/ ${amount}`))).toBe("created");
      const [item] = await pending();
      expect(item.isNewSender).toBe(true);
      expect((await dismiss(item.id)).status).toBe(204);
    }
    expect(await outcome(await receive(promo, "Llévalo desde S/ 59.90"))).toBe("blocked");
    expect(await prisma.inboxSender.findFirst({ where: { userId, address: "promo@tienda.pe" } })).toMatchObject({
      status: "blocked",
    });
  });

  it("confía en un remitente nuevo cuando aceptas su movimiento", async () => {
    const food = await prisma.category.create({ data: { userId, name: "Comida", icon: "🍜", color: "#FDDCC4" } });
    const bank = "Alertas <alertas@otrobanco.pe>";
    await receive(bank, "Monto\tS/ 20.00\nComercio\tTAMBO");
    const [first] = await pending();
    expect(first.isNewSender).toBe(true);
    await accept(first.id, { ...first, amount: 20, categoryId: food.id, description: "Tambo" });

    await receive(bank, "Monto\tS/ 8.00\nComercio\tTAMBO");
    expect((await pending())[0]).toMatchObject({ isNewSender: false, isLearned: true, categoryId: food.id });
  });

  it("ignora correos de remitentes conocidos sin monto", async () => {
    expect(await outcome(await receive(BCP, "Actualizamos nuestros términos y condiciones."))).toBe("ignored");
  });
});
