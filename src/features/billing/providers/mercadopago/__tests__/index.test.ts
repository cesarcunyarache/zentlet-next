import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BillingProviderError } from "../../types";
import { createMercadoPagoProvider } from "../index";

const SECRET = "webhook-secret";
const TOKEN = "TEST-token";
const fetchMock = vi.fn();

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    url,
    init,
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
};

const checkoutInput = {
  subscriptionId: "sub-1",
  reason: "Zentlet Pro",
  payerEmail: "ana@example.com",
  amount: 1490,
  currency: "PEN",
  interval: "month" as const,
  firstChargeAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  returnUrl: "https://zentlet.app/admin?billing=return",
};

function signedNotification({
  ts,
  dataId = "PRE-1",
  type = "subscription_preapproval",
}: {
  ts: string;
  dataId?: string;
  type?: string;
}) {
  const requestId = "req-1";
  const v1 = createHmac("sha256", SECRET)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest("hex");
  return new Request(`https://zentlet.app/api/billing/webhooks/mercadopago?data.id=${dataId}&type=${type}`, {
    method: "POST",
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    body: JSON.stringify({ id: 777, type, data: { id: dataId } }),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", TOKEN);
  vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("MERCADOPAGO_TEST_PAYER_EMAIL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("MERCADOPAGO_API_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("createCheckout", () => {
  it("crea la preapproval con token, clave de idempotencia y el correo del usuario", async () => {
    fetchMock.mockResolvedValue(json({ id: "pre-1", status: "pending", init_point: "https://mp/checkout" }));

    const result = await createMercadoPagoProvider().createCheckout(checkoutInput);

    expect(result).toEqual({ externalId: "pre-1", checkoutUrl: "https://mp/checkout" });
    const { url, init, headers, body } = lastCall();
    expect(url).toBe("https://api.mercadopago.com/preapproval");
    expect(init.method).toBe("POST");
    expect(headers).toMatchObject({ Authorization: `Bearer ${TOKEN}`, "X-Idempotency-Key": "checkout:sub-1" });
    expect(body).toMatchObject({ payer_email: "ana@example.com", external_reference: "sub-1", status: "pending" });
  });

  it("en sandbox usa el comprador de prueba configurado", async () => {
    vi.stubEnv("MERCADOPAGO_TEST_PAYER_EMAIL", "test_user_1@testuser.com");
    fetchMock.mockResolvedValue(json({ id: "pre-1", status: "pending", init_point: "https://mp/checkout" }));

    await createMercadoPagoProvider().createCheckout(checkoutInput);

    expect(lastCall().body.payer_email).toBe("test_user_1@testuser.com");
  });

  it("en producción ignora el comprador de prueba", async () => {
    vi.stubEnv("MERCADOPAGO_TEST_PAYER_EMAIL", "test_user_1@testuser.com");
    vi.stubEnv("VERCEL_ENV", "production");
    fetchMock.mockResolvedValue(json({ id: "pre-1", status: "pending", init_point: "https://mp/checkout" }));

    await createMercadoPagoProvider().createCheckout(checkoutInput);

    expect(lastCall().body.payer_email).toBe("ana@example.com");
  });

  it("un rechazo de la pasarela conserva el estado y el motivo", async () => {
    fetchMock.mockResolvedValue(json({ message: "Payer is associated with a different site" }, 400));

    const error = await createMercadoPagoProvider()
      .createCheckout(checkoutInput)
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(BillingProviderError);
    expect(error).toMatchObject({ status: 400 });
    expect(error.message).toContain("(400): Payer is associated with a different site");
  });

  it("sin url de checkout en la respuesta es un error", async () => {
    fetchMock.mockResolvedValue(json({ id: "pre-1", status: "pending" }));
    await expect(createMercadoPagoProvider().createCheckout(checkoutInput)).rejects.toThrow("no checkout url");
  });

  it("la url de la API sólo se puede cambiar fuera de producción (tests E2E)", async () => {
    vi.stubEnv("MERCADOPAGO_API_URL", "http://localhost:4010");
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ id: "pre-1", status: "pending", init_point: "https://mp/checkout" })),
    );

    await createMercadoPagoProvider().createCheckout(checkoutInput);
    expect(lastCall().url).toBe("http://localhost:4010/preapproval");

    vi.stubEnv("VERCEL_ENV", "production");
    await createMercadoPagoProvider().createCheckout(checkoutInput);
    expect(lastCall().url).toBe("https://api.mercadopago.com/preapproval");
  });

  it("sin token configurado falla antes de llamar a la pasarela", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    await expect(createMercadoPagoProvider().createCheckout(checkoutInput)).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("consultas y cambios", () => {
  it("getSubscription traduce la preapproval", async () => {
    fetchMock.mockResolvedValue(json({ id: "pre-1", status: "authorized", external_reference: "sub-1" }));

    expect(await createMercadoPagoProvider().getSubscription("pre-1")).toMatchObject({
      status: "active",
      reference: "sub-1",
    });
    expect(lastCall().url).toBe("https://api.mercadopago.com/preapproval/pre-1");
  });

  it("getPayment consulta la cuota autorizada", async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 7001,
        preapproval_id: "pre-1",
        status: "processed",
        transaction_amount: 14.9,
        currency_id: "PEN",
        payment: { id: 99, status: "approved" },
      }),
    );

    expect(await createMercadoPagoProvider().getPayment("7001")).toMatchObject({
      status: "approved",
      amount: 1490,
      providerPaymentId: "99",
    });
    expect(lastCall().url).toBe("https://api.mercadopago.com/authorized_payments/7001");
  });

  it("cancelSubscription envía el estado cancelled", async () => {
    fetchMock.mockResolvedValue(json({ id: "pre-1", status: "cancelled" }));

    await createMercadoPagoProvider().cancelSubscription("pre-1");

    expect(lastCall()).toMatchObject({
      url: "https://api.mercadopago.com/preapproval/pre-1",
      body: { status: "cancelled" },
    });
    expect(lastCall().init.method).toBe("PUT");
  });

  it("refundPayment convierte céntimos y envía la clave de idempotencia", async () => {
    fetchMock.mockResolvedValue(json({ id: 1 }));

    await createMercadoPagoProvider().refundPayment({
      providerPaymentId: "99",
      amount: 745,
      idempotencyKey: "refund:p1:0",
    });

    expect(lastCall()).toMatchObject({
      url: "https://api.mercadopago.com/v1/payments/99/refunds",
      body: { amount: 7.45 },
    });
    expect(lastCall().headers["X-Idempotency-Key"]).toBe("refund:p1:0");
  });
});

describe("parseWebhook", () => {
  const nowSeconds = () => String(Math.floor(Date.now() / 1000));

  it("acepta la firma real de Mercado Pago (hora en segundos) y normaliza la notificación", async () => {
    const notification = await createMercadoPagoProvider().parseWebhook(signedNotification({ ts: nowSeconds() }));

    expect(notification).toEqual({
      eventId: "subscription_preapproval:777",
      type: "subscription_preapproval",
      resource: "subscription",
      resourceId: "PRE-1",
    });
  });

  it("también acepta la hora en milisegundos", async () => {
    const request = signedNotification({ ts: String(Date.now()), type: "subscription_authorized_payment" });
    expect(await createMercadoPagoProvider().parseWebhook(request)).toMatchObject({ resource: "payment" });
  });

  it("un tópico que no usamos queda como ignorado", async () => {
    const request = signedNotification({ ts: nowSeconds(), type: "payment" });
    expect(await createMercadoPagoProvider().parseWebhook(request)).toMatchObject({ resource: "ignored" });
  });

  it("rechaza una firma de otro secreto, una caducada y un cuerpo que no es JSON", async () => {
    const provider = createMercadoPagoProvider();
    const stale = String(Math.floor(Date.now() / 1000) - 3600);

    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "otro-secreto");
    expect(await provider.parseWebhook(signedNotification({ ts: nowSeconds() }))).toBeNull();

    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    expect(await provider.parseWebhook(signedNotification({ ts: stale }))).toBeNull();

    const valid = signedNotification({ ts: nowSeconds() });
    const broken = new Request(valid.url, { method: "POST", headers: valid.headers, body: "no-json" });
    expect(await provider.parseWebhook(broken)).toBeNull();
  });
});
