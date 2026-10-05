import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";

/*
 * Mercado Pago simulado para los tests E2E: la API de suscripciones, la
 * página de pago alojada y los webhooks firmados igual que los reales
 * (HMAC-SHA256 de `id;request-id;ts` con la hora en segundos).
 * `/__control/*` lo usan los tests para preparar y provocar escenarios.
 */

const PORT = Number(process.env.MOCK_MP_PORT ?? 4010);
const APP_URL = process.env.MOCK_MP_APP_URL ?? "http://localhost:3100";
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";

const preapprovals = new Map();
const authorizedPayments = new Map();
const refunds = [];
let webhooksEnabled = true;
let shouldFailNextCancel = false;
let sequence = 1000;

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const readJson = async (req) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};

const addMonth = (date) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
};

async function sendWebhook(type, dataId) {
  if (!webhooksEnabled) return;
  const ts = String(Math.floor(Date.now() / 1000));
  const requestId = randomUUID();
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", WEBHOOK_SECRET).update(manifest).digest("hex");
  await fetch(`${APP_URL}/api/billing/webhooks/mercadopago?data.id=${dataId}&type=${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    body: JSON.stringify({ id: ++sequence, type, action: "updated", data: { id: String(dataId) } }),
  }).catch(() => undefined);
}

function createPreapproval(body) {
  const id = randomUUID().replaceAll("-", "");
  const preapproval = {
    id,
    status: "pending",
    reason: body.reason,
    external_reference: body.external_reference,
    payer_email: body.payer_email,
    back_url: body.back_url,
    auto_recurring: body.auto_recurring,
    next_payment_date: null,
    init_point: `http://localhost:${PORT}/checkout/${id}`,
  };
  preapprovals.set(id, preapproval);
  return preapproval;
}

async function authorize(preapproval) {
  preapproval.status = "authorized";
  preapproval.next_payment_date = preapproval.auto_recurring.start_date ?? addMonth(new Date());
  await sendWebhook("subscription_preapproval", preapproval.id);
}

async function charge(preapproval, approved) {
  const id = ++sequence;
  authorizedPayments.set(String(id), {
    id,
    preapproval_id: preapproval.id,
    status: approved ? "processed" : "recycling",
    transaction_amount: preapproval.auto_recurring.transaction_amount,
    currency_id: preapproval.auto_recurring.currency_id,
    debit_date: new Date().toISOString(),
    payment: { id: ++sequence, status: approved ? "approved" : "rejected" },
  });
  if (approved) preapproval.next_payment_date = addMonth(new Date());
  await sendWebhook("subscription_authorized_payment", id);
  return id;
}

const latestPreapproval = () => [...preapprovals.values()].at(-1);

function checkoutPage(preapproval) {
  const { transaction_amount: amount, currency_id: currency } = preapproval.auto_recurring;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Mercado Pago (simulado)</title></head>
<body><main><h1>Mercado Pago (simulado)</h1><p>${preapproval.reason} · ${currency} ${amount}</p>
<form method="post" action="/checkout/${preapproval.id}/authorize"><button type="submit">Pagar</button></form></main></body></html>`;
}

async function handleControl(req, res, path) {
  if (path === "/__control/state") {
    return json(res, 200, { preapprovals: [...preapprovals.values()], refunds, webhooksEnabled });
  }
  const body = await readJson(req);
  if (path === "/__control/reset") {
    preapprovals.clear();
    authorizedPayments.clear();
    refunds.length = 0;
    webhooksEnabled = true;
    shouldFailNextCancel = false;
    return json(res, 200, { ok: true });
  }
  if (path === "/__control/fail-next-cancel") {
    shouldFailNextCancel = true;
    return json(res, 200, { ok: true });
  }
  if (path === "/__control/webhooks") {
    webhooksEnabled = Boolean(body.enabled);
    return json(res, 200, { webhooksEnabled });
  }
  if (path === "/__control/charge") {
    const preapproval = latestPreapproval();
    if (!preapproval) return json(res, 404, { message: "no preapproval" });
    return json(res, 200, { id: await charge(preapproval, body.status === "approved") });
  }
  return json(res, 404, { message: "unknown control" });
}

async function handleCheckout(req, res, segments) {
  const preapproval = preapprovals.get(segments[1]);
  if (!preapproval) return json(res, 404, { message: "not found" });
  if (req.method === "POST" && segments[2] === "authorize") {
    await authorize(preapproval);
    res.writeHead(303, { Location: preapproval.back_url });
    return res.end();
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(checkoutPage(preapproval));
}

async function handleApi(req, res, segments) {
  const [resource, id, sub, action] = segments;

  if (resource === "preapproval" && req.method === "POST") {
    const body = await readJson(req);
    if (!body.payer_email) return json(res, 400, { message: "payer_email is required" });
    return json(res, 201, createPreapproval(body));
  }
  if (resource === "preapproval") {
    const preapproval = preapprovals.get(id);
    if (!preapproval) return json(res, 404, { message: "preapproval not found" });
    if (req.method === "PUT") {
      const changes = await readJson(req);
      if (shouldFailNextCancel && changes.status === "cancelled") {
        shouldFailNextCancel = false;
        return json(res, 503, { message: "service unavailable" });
      }
      Object.assign(preapproval, changes);
    }
    return json(res, 200, preapproval);
  }
  if (resource === "authorized_payments") {
    const payment = authorizedPayments.get(id);
    return payment ? json(res, 200, payment) : json(res, 404, { message: "authorized payment not found" });
  }
  if (resource === "v1" && id === "payments" && action === "refunds") {
    refunds.push({ paymentId: sub, ...(await readJson(req)), idempotencyKey: req.headers["x-idempotency-key"] });
    return json(res, 201, { id: ++sequence });
  }
  return json(res, 404, { message: "not found" });
}

http
  .createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
      const segments = pathname.split("/").filter(Boolean);
      if (pathname.startsWith("/__control/")) return await handleControl(req, res, pathname);
      if (segments[0] === "checkout") return await handleCheckout(req, res, segments);
      return await handleApi(req, res, segments);
    } catch (error) {
      return json(res, 500, { message: String(error) });
    }
  })
  .listen(PORT);
