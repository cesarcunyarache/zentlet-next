import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET as startConnect } from "@/app/api/inbox/gmail/connect/route";
import { GET as callback } from "@/app/api/inbox/gmail/callback/route";
import { DELETE as disconnect } from "@/app/api/inbox/gmail/route";
import { POST as push } from "@/app/api/inbox/gmail/push/route";
import { GET as renewCron } from "@/app/api/cron/gmail-watch/route";
import { GET as getConnection } from "@/app/api/inbox/connection/route";
import { createUser, resetDatabase } from "@/test/integration/database";
import type { TInboxConnection } from "../types";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/features/budget/server/check", () => ({ scheduleBudgetCheck: vi.fn() }));

const getSession = vi.mocked(auth.api.getSession);
const BASE_URL = "http://localhost";
const PUSH_SECRET = "push-secret";
const GMAIL = "cesar@gmail.com";
const encode = (value: string) => Buffer.from(value).toString("base64url");

const BCP_BODY = `Realizaste un consumo de S/ 14.50 con tu Tarjeta de Débito BCP en IKF A53 PIURA 21.
Total del consumo\tS/ 14.50
Fecha y hora\t24 de setiembre de 2026 - 06:54 PM
Número de operación\t576278`;

interface FakeMessage {
  from: string;
  body: string;
}

const google = {
  messages: {} as Record<string, FakeMessage>,
  historyIds: [] as string[],
  revokedRefresh: false,
  calls: [] as string[],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function fakeGoogle(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(input.toString());
  const params = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams();
  google.calls.push(`${init?.method ?? "GET"} ${url.pathname}`);

  if (url.pathname === "/token" && params.get("grant_type") === "authorization_code") {
    return json({
      access_token: "access-1",
      refresh_token: "refresh-1",
      scope: params.get("code") === "no-scope" ? "openid" : "https://www.googleapis.com/auth/gmail.readonly",
    });
  }
  if (url.pathname === "/token") {
    return google.revokedRefresh ? json({ error: "invalid_grant" }, 400) : json({ access_token: "access-2" });
  }
  if (url.pathname === "/revoke") return json({});
  if (url.pathname.endsWith("/profile")) return json({ emailAddress: GMAIL, historyId: "900" });
  if (url.pathname.endsWith("/watch")) return json({ historyId: "1000", expiration: String(Date.now() + 7 * 86_400_000) });
  if (url.pathname.endsWith("/stop")) return new Response(null, { status: 204 });
  if (url.pathname.endsWith("/history")) {
    return json({
      historyId: "1100",
      history: [{ messagesAdded: google.historyIds.map((id) => ({ message: { id, labelIds: ["INBOX"] } })) }],
    });
  }
  const messageId = /\/messages\/([^/]+)$/.exec(url.pathname)?.[1];
  const message = messageId ? google.messages[messageId] : undefined;
  if (messageId && !message) return json({ error: { status: "NOT_FOUND" } }, 404);
  if (messageId && message) {
    const headers = [
      { name: "From", value: message.from },
      { name: "Subject", value: "Constancia de consumo" },
    ];
    if (url.searchParams.get("format") === "metadata") return json({ id: messageId, payload: { headers: headers.slice(0, 1) } });
    return json({
      id: messageId,
      internalDate: String(Date.parse("2026-09-24T23:55:00-05:00")),
      payload: { mimeType: "text/plain", headers, body: { data: encode(message.body) } },
    });
  }
  return json({ error: "unexpected" }, 500);
}

let userId: string;

const signIn = (id: string) => getSession.mockResolvedValue({ user: { id } } as never);
const request = (path: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) =>
  new NextRequest(`${BASE_URL}${path}`, init);

function notify(token = PUSH_SECRET) {
  const data = Buffer.from(JSON.stringify({ emailAddress: GMAIL, historyId: 1100 })).toString("base64");
  return push(request(`/api/inbox/gmail/push?token=${token}`, { method: "POST", body: JSON.stringify({ message: { data } }) }));
}

async function connectGmail(code = "auth-code") {
  const started = await startConnect(request("/api/inbox/gmail/connect"));
  const state = new URL(started.headers.get("location")!).searchParams.get("state")!;
  const response = await callback(
    request(`/api/inbox/gmail/callback?code=${code}&state=${state}`, { headers: { cookie: `gmail_oauth_state=${state}` } }),
  );
  return new URL(response.headers.get("location")!).searchParams.get("gmail");
}

async function makePro(id: string) {
  await prisma.subscription.create({
    data: { userId: id, planKey: "pro", status: "active", amount: 1490, currency: "PEN", interval: "month", provider: "mercadopago" },
  });
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
  vi.stubEnv("BETTER_AUTH_URL", BASE_URL);
  vi.stubEnv("GMAIL_PUBSUB_TOPIC", "projects/zentlet/topics/gmail");
  vi.stubEnv("GMAIL_PUSH_SECRET", PUSH_SECRET);
  vi.stubEnv("TOKEN_ENCRYPTION_KEY", "integration-key");
  vi.stubGlobal("fetch", vi.fn(fakeGoogle));
  Object.assign(google, { messages: {}, historyIds: [], revokedRefresh: false, calls: [] });
  await resetDatabase();
  userId = (await createUser()).id;
  signIn(userId);
  await makePro(userId);
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await resetDatabase();
  await prisma.$disconnect();
});

describe("vincular Gmail", () => {
  it("pide permiso de solo lectura a Google y guarda el token cifrado", async () => {
    const started = await startConnect(request("/api/inbox/gmail/connect"));
    const location = new URL(started.headers.get("location")!);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/gmail.readonly");
    expect(location.searchParams.get("redirect_uri")).toBe(`${BASE_URL}/api/inbox/gmail/callback`);

    expect(await connectGmail()).toBe("connected");
    const saved = await prisma.gmailConnection.findUniqueOrThrow({ where: { userId } });
    expect(saved).toMatchObject({ email: GMAIL, status: "active", historyId: BigInt(1000) });
    expect(saved.refreshToken).not.toContain("refresh-1");

    const connection = (await (await getConnection(request("/api/inbox/connection"))).json()) as TInboxConnection;
    expect(connection.gmail).toMatchObject({ isAvailable: true, email: GMAIL, status: "active" });
  });

  it("rechaza el retorno de Google sin el state de la cookie", async () => {
    const response = await callback(request("/api/inbox/gmail/callback?code=x&state=forged"));
    expect(new URL(response.headers.get("location")!).searchParams.get("gmail")).toBe("error");
    expect(await prisma.gmailConnection.count()).toBe(0);
  });

  it("exige el permiso de Gmail", async () => {
    expect(await connectGmail("no-scope")).toBe("scope_denied");
    expect(await prisma.gmailConnection.count()).toBe(0);
  });

  it("no deja vincular el mismo Gmail a dos cuentas", async () => {
    await connectGmail();
    const other = await createUser();
    await makePro(other.id);
    signIn(other.id);
    expect(await connectGmail()).toBe("taken");
  });

  it("cada aviso del banco que llega queda por confirmar, sin leer los demás correos", async () => {
    await connectGmail();
    google.messages = {
      bank: { from: "BCP <notificaciones@notificacionesbcp.com.pe>", body: BCP_BODY },
      personal: { from: "Mamá <mama@gmail.com>", body: "Te presto S/ 50.00" },
    };
    google.historyIds = ["bank", "personal", "deleted"];
    google.calls = [];

    expect((await notify()).status).toBe(204);

    const items = await prisma.inboxTransaction.findMany({ where: { userId } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ bank: "BCP", externalId: "gmail:bank", reference: "576278", status: "pending" });
    expect(Number(items[0].amount)).toBe(14.5);
    expect(google.calls.filter((call) => call.endsWith("/messages/personal"))).toHaveLength(1);
    expect((await prisma.gmailConnection.findUniqueOrThrow({ where: { userId } })).historyId).toBe(BigInt(1100));

    expect((await notify()).status).toBe(204);
    expect(await prisma.inboxTransaction.count({ where: { userId } })).toBe(1);
  });

  it("también escucha a los remitentes que agregaste", async () => {
    await connectGmail();
    await prisma.inboxSender.create({ data: { userId, address: "@otrobanco.pe", status: "trusted", origin: "manual" } });
    google.messages = { alert: { from: "alertas@otrobanco.pe", body: "Monto\tS/ 20.00\nComercio\tTAMBO" } };
    google.historyIds = ["alert"];

    await notify();
    expect(await prisma.inboxTransaction.count({ where: { userId } })).toBe(1);
  });

  it("rechaza notificaciones sin el secreto de Pub/Sub", async () => {
    expect((await notify("wrong")).status).toBe(401);
  });

  it("marca la conexión como revocada si Google retira el acceso", async () => {
    await connectGmail();
    google.revokedRefresh = true;
    expect((await notify()).status).toBe(204);
    expect((await prisma.gmailConnection.findUniqueOrThrow({ where: { userId } })).status).toBe("revoked");
  });

  it("renueva la suscripción cada día y recupera avisos perdidos", async () => {
    await connectGmail();
    google.messages = { bank: { from: "notificaciones@notificacionesbcp.com.pe", body: BCP_BODY } };
    google.historyIds = ["bank"];

    const response = await renewCron(
      request("/api/cron/gmail-watch", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }),
    );
    expect(await response.json()).toEqual({ renewed: 1, failed: 0 });
    expect(await prisma.inboxTransaction.count({ where: { userId } })).toBe(1);
  });

  it("al desconectar detiene la escucha y revoca el permiso", async () => {
    await connectGmail();
    google.calls = [];
    const response = await disconnect(request("/api/inbox/gmail", { method: "DELETE" }));
    expect(((await response.json()) as TInboxConnection).gmail.email).toBeNull();
    expect(google.calls).toEqual(expect.arrayContaining(["POST /gmail/v1/users/me/stop", "POST /revoke"]));
    expect(await prisma.gmailConnection.count()).toBe(0);
  });
});
