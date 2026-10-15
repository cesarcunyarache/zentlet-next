import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

const execute = vi.hoisted(() => vi.fn());

vi.mock("@/features/whatsapp/server/infrastructure/whatsapp.container", () => ({
  whatsappConfig: {
    accessToken: "token",
    phoneNumberId: "1234567890",
    appSecret: "app-secret",
    verifyToken: "verify-me",
    businessPhone: "51999888777",
    graphVersion: "v23.0",
  },
  whatsappUseCases: { handleMessage: { execute } },
}));

vi.mock("@/lib/background", () => ({ runInBackground: (task: () => Promise<unknown>) => task() }));

const URL = "http://localhost/api/whatsapp/webhook";

const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "1234567890" },
            messages: [{ id: "wamid.1", from: "51987654321", type: "text", text: { body: "almuerzo 25" } }],
          },
        },
      ],
    },
  ],
});

const sign = (raw: string) => `sha256=${createHmac("sha256", "app-secret").update(raw).digest("hex")}`;

const post = (raw: string, signature?: string) =>
  POST(new Request(URL, { method: "POST", body: raw, headers: signature ? { "x-hub-signature-256": signature } : {} }));

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue("handled");
});

describe("GET /api/whatsapp/webhook", () => {
  it("devuelve el challenge solo con el token de verificación correcto", async () => {
    const ok = await GET(new Request(`${URL}?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");

    const wrong = await GET(new Request(`${URL}?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=42`));
    expect(wrong.status).toBe(403);
  });
});

describe("POST /api/whatsapp/webhook", () => {
  it("rechaza cuerpos sin firma válida sin procesar nada", async () => {
    expect((await post(body)).status).toBe(401);
    expect((await post(body, sign(`${body} `))).status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it("procesa los mensajes firmados", async () => {
    const response = await post(body, sign(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: 1 });
    expect(execute).toHaveBeenCalledWith({ id: "wamid.1", from: "51987654321", kind: "text", text: "almuerzo 25" });
  });

  it("responde 200 a eventos sin mensajes (estados de entrega) para que Meta no reintente", async () => {
    const statuses = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: {} }] }] });
    const response = await post(statuses, sign(statuses));

    expect(response.status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
  });
});
