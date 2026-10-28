import { createHmac, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateObject } from "@/lib/ai/client";
import { DELETE as unlinkRoute, GET as connectionRoute, POST as linkCodeRoute } from "@/app/api/whatsapp/connection/route";
import { POST as webhookRoute } from "@/app/api/whatsapp/webhook/route";
import { createUser, resetDatabase } from "@/test/integration/database";
import type { InterpretationOutput } from "../ai/schemas/whatsapp-ai.schema";
import type { TWhatsappConnection, TWhatsappLinkCode } from "../types";

const env = vi.hoisted(() => {
  const values = {
    WHATSAPP_ACCESS_TOKEN: "meta-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_BUSINESS_PHONE: "51999888777",
    WHATSAPP_APP_SECRET: "app-secret",
    WHATSAPP_VERIFY_TOKEN: "verify-me",
  };
  Object.assign(process.env, values);
  return values;
});

const background = vi.hoisted(() => ({ tasks: [] as Promise<unknown>[] }));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/features/budget/server/infrastructure/budget.monitor", () => ({ scheduleBudgetCheck: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/background", () => ({
  runInBackground: (task: () => Promise<unknown>) => background.tasks.push(task()),
}));

const getSession = vi.mocked(auth.api.getSession);
const model = vi.mocked(generateObject);
const BASE_URL = "http://localhost";
const PHONE = "51987654321";

interface SentMessage {
  to: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    body: { text: string };
    action: { buttons?: { reply: { id: string } }[]; sections?: { rows: { id: string; title: string }[] }[] };
  };
}

let userId: string;
let sent: SentMessage[];
let foodId: string;
let transportId: string;

function stubMeta() {
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as SentMessage & { status?: string }) : null;
      if (body?.to) sent.push(body);
      return new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 });
    }),
  );
}

const sign = (raw: string) => `sha256=${createHmac("sha256", env.WHATSAPP_APP_SECRET).update(raw).digest("hex")}`;

async function deliver(message: Record<string, unknown>, from = PHONE) {
  const raw = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID },
              messages: [{ id: `wamid.${randomUUID()}`, from, ...message }],
            },
          },
        ],
      },
    ],
  });
  return deliverRaw(raw);
}

async function deliverRaw(raw: string, signature = sign(raw)) {
  const response = await webhookRoute(
    new Request(`${BASE_URL}/api/whatsapp/webhook`, {
      method: "POST",
      body: raw,
      headers: { "x-hub-signature-256": signature },
    }),
  );
  await Promise.all(background.tasks.splice(0));
  return response;
}

const text = (body: string, from?: string) => deliver({ type: "text", text: { body } }, from);
const tap = (id: string) => deliver({ type: "interactive", interactive: { type: "button_reply", button_reply: { id, title: "x" } } });
const pick = (id: string) => deliver({ type: "interactive", interactive: { type: "list_reply", list_reply: { id, title: "x" } } });

const lastSent = () => sent.at(-1)!;
const lastText = () => lastSent().text?.body ?? lastSent().interactive?.body.text ?? "";

function aiAnswers(output: Partial<InterpretationOutput>) {
  model.mockResolvedValueOnce({ intent: "record", movements: [], period: null, reply: null, ...output });
}

const connection = async () =>
  (await (await connectionRoute(new Request(`${BASE_URL}/api/whatsapp/connection`))).json()) as TWhatsappConnection;

async function linkPhone() {
  const response = await linkCodeRoute(new Request(`${BASE_URL}/api/whatsapp/connection`, { method: "POST" }));
  const { code } = (await response.json()) as TWhatsappLinkCode;
  await text(`vincular ${code}`);
}

beforeEach(async () => {
  vi.clearAllMocks();
  model.mockReset();
  stubMeta();
  await resetDatabase();
  await prisma.whatsappMessage.deleteMany();
  userId = (await createUser()).id;
  getSession.mockResolvedValue({ user: { id: userId } } as never);
  const [food, transport] = await Promise.all([
    prisma.category.create({ data: { userId, name: "Comida", icon: "🍔", color: "#FDE68A" } }),
    prisma.category.create({ data: { userId, name: "Transporte", icon: "🚕", color: "#BFDBFE" } }),
  ]);
  foodId = food.id;
  transportId = transport.id;
});

describe("WhatsApp · vinculación", () => {
  it("genera un código en la app, lo recibe por WhatsApp y vincula el número", async () => {
    expect(await connection()).toEqual({ isAvailable: true, phone: null, linkedAt: null });

    const response = await linkCodeRoute(new Request(`${BASE_URL}/api/whatsapp/connection`, { method: "POST" }));
    expect(response.status).toBe(201);
    const linkCode = (await response.json()) as TWhatsappLinkCode;
    expect(linkCode.url).toBe(`https://wa.me/51999888777?text=${encodeURIComponent(`vincular ${linkCode.code}`)}`);
    expect(await prisma.whatsappLinkCode.findUnique({ where: { userId } })).not.toBeNull();

    await text(`vincular ${linkCode.code.toLowerCase()}`);

    expect(lastSent()).toMatchObject({ to: PHONE, type: "text" });
    expect(lastText()).toContain("Ana");
    expect(await connection()).toMatchObject({ phone: PHONE });
    expect(await prisma.whatsappLinkCode.count()).toBe(0);
  });

  it("un código ya usado o inventado no vincula", async () => {
    await text("vincular AAAA-BBBB");
    expect(lastText()).toContain("no es válido");
    expect(await connection()).toMatchObject({ phone: null });
  });

  it("un número no vinculado recibe el enlace a la app y no gasta IA", async () => {
    await text("almuerzo 25", "51911111111");
    expect(lastSent().to).toBe("51911111111");
    expect(lastText()).toContain("Ajustes → WhatsApp");
    expect(model).not.toHaveBeenCalled();
  });

  it("desvincular desde la app corta el acceso", async () => {
    await linkPhone();
    const response = await unlinkRoute(new Request(`${BASE_URL}/api/whatsapp/connection`, { method: "DELETE" }));
    expect(((await response.json()) as TWhatsappConnection).phone).toBeNull();

    await text("almuerzo 25");
    expect(lastText()).toContain("Ajustes → WhatsApp");
  });

  it("rechaza webhooks sin la firma de Meta", async () => {
    const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    expect((await deliverRaw(raw, "sha256=falsa")).status).toBe(401);
  });
});

describe("WhatsApp · conversación con datos reales", () => {
  beforeEach(linkPhone);

  it("pregunta el monto y la categoría, y crea la transacción en la base de datos", async () => {
    aiAnswers({ movements: [{ type: "expense", amount: null, categoryId: null, description: "Taxi", date: null }] });
    await text("gasté en taxi");
    expect(lastSent().interactive?.type).toBe("button");
    expect(lastText()).toBe("¿Cuánto fue Taxi?");

    await text("18");
    expect(model).toHaveBeenCalledTimes(1);
    expect(lastSent().interactive?.type).toBe("list");
    const rows = lastSent().interactive!.action.sections![0].rows;
    expect(rows.map((row) => row.title).sort()).toEqual(["Comida", "Transporte"]);
    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);

    await pick(`cat:${transportId}`);

    const [transaction] = await prisma.transaction.findMany({ where: { userId } });
    expect(transaction).toMatchObject({ description: "Taxi", type: "expense", categoryId: transportId });
    expect(Number(transaction.amount)).toBe(18);
    expect(lastText()).toContain("Gasto de S/ 18.00 · Transporte · hoy");

    const link = await prisma.whatsappLink.findUniqueOrThrow({ where: { userId } });
    expect(link.conversation).toMatchObject({ drafts: [], lastRecorded: [transaction.id] });
  });

  it("registra varios movimientos de un mensaje y el botón deshacer los borra", async () => {
    aiAnswers({
      movements: [
        { type: "expense", amount: 45, categoryId: foodId, description: "Mercado", date: "2026-10-14" },
        { type: "income", amount: 1200, categoryId: foodId, description: "Venta", date: null },
      ],
    });
    await text("ayer 45 de mercado y vendí 1200");

    expect(await prisma.transaction.count({ where: { userId } })).toBe(2);
    expect(lastText()).toContain("Registré 2 movimientos");

    const undoId = lastSent().interactive!.action.buttons![0].reply.id;
    await tap(undoId);

    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);
    expect(lastText()).toContain("borré 2 movimientos");
  });

  it("un reintento de Meta con el mismo mensaje no duplica la transacción", async () => {
    aiAnswers({ movements: [{ type: "expense", amount: 25, categoryId: foodId, description: "Almuerzo", date: null }] });
    const raw = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID },
                messages: [{ id: "wamid.repetido", from: PHONE, type: "text", text: { body: "almuerzo 25" } }],
              },
            },
          ],
        },
      ],
    });

    await deliverRaw(raw);
    await deliverRaw(raw);

    expect(await prisma.transaction.count({ where: { userId } })).toBe(1);
  });

  it("sin IA disponible registra con el parser local", async () => {
    model.mockRejectedValueOnce(new Error("AI provider is not configured"));
    await text("comida 32.50");

    const [transaction] = await prisma.transaction.findMany({ where: { userId } });
    expect(transaction).toMatchObject({ categoryId: foodId });
    expect(Number(transaction.amount)).toBe(32.5);
  });

  it("responde el resumen con los movimientos guardados", async () => {
    aiAnswers({ movements: [{ type: "expense", amount: 40, categoryId: foodId, description: "Cena", date: null }] });
    await text("cena 40");

    aiAnswers({ intent: "summary", period: { from: null, to: null } });
    await text("¿cuánto gasté este mes?");

    expect(lastText()).toContain("Gastos: S/ 40.00");
    expect(lastText()).toContain("Comida: S/ 40.00");
  });

  it("«cancelar» descarta lo pendiente sin crear nada", async () => {
    aiAnswers({ movements: [{ type: "expense", amount: null, categoryId: null, description: "Cine", date: null }] });
    await text("fui al cine");
    await text("cancelar");

    expect(lastText()).toBe("Ok, lo dejé sin registrar.");
    await text("20");
    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);
  });
});
