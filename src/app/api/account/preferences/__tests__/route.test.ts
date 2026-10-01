import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET, PATCH } from "./route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: { userPreference: { findUnique: vi.fn(), upsert: vi.fn() }, $queryRaw: vi.fn() },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const URL = "http://localhost/api/account/preferences";
const load = () => GET(new Request(URL));
const update = (body: unknown) =>
  PATCH(new Request(URL, { method: "PATCH", body: typeof body === "string" ? body : JSON.stringify(body) }));

const stored = { language: "en", currency: "USD", timezone: "Europe/Madrid", extras: {} };

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.userPreference.upsert.mockResolvedValue(stored as never);
});

describe("GET /api/account/preferences", () => {
  it("sin sesión es 401", async () => {
    getSession.mockResolvedValue(null);
    expect((await load()).status).toBe(401);
    expect(db.userPreference.findUnique).not.toHaveBeenCalled();
  });

  it("devuelve null si la cuenta aún no tiene preferencias", async () => {
    db.userPreference.findUnique.mockResolvedValue(null);
    const response = await load();
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("devuelve las preferencias del usuario de la sesión", async () => {
    db.userPreference.findUnique.mockResolvedValue(stored as never);
    expect(await (await load()).json()).toEqual(stored);
    expect(db.userPreference.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("un valor guardado fuera de lo admitido vuelve al de por defecto", async () => {
    db.userPreference.findUnique.mockResolvedValue({
      language: "fr",
      currency: "S/",
      timezone: "Mars/Olympus",
      extras: "roto",
    } as never);
    expect(await (await load()).json()).toEqual({
      language: "es",
      currency: "PEN",
      timezone: "America/Lima",
      extras: {},
    });
  });

  it("un fallo de la base de datos es 500", async () => {
    db.userPreference.findUnique.mockRejectedValue(new Error("db down"));
    expect((await load()).status).toBe(500);
  });
});

describe("PATCH /api/account/preferences", () => {
  it("sin sesión es 401 y no escribe", async () => {
    getSession.mockResolvedValue(null);
    expect((await update({ currency: "USD" })).status).toBe(401);
    expect(db.userPreference.upsert).not.toHaveBeenCalled();
  });

  it("guarda sólo los campos enviados y crea la fila si no existe", async () => {
    const response = await update({ currency: "USD" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(stored);
    expect(db.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: { userId: "user-1", currency: "USD" },
        update: { currency: "USD" },
      }),
    );
  });

  it("acepta todas las preferencias a la vez", async () => {
    const all = { language: "en", currency: "EUR", timezone: "Europe/Madrid", extras: {} };
    expect((await update(all)).status).toBe(200);
    expect(db.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: "user-1", ...all }, update: all }),
    );
  });

  it.each([
    ["una moneda desconocida", { currency: "BTC" }],
    ["el símbolo en vez del código", { currency: "S/" }],
    ["un idioma sin traducción", { language: "fr" }],
    ["una zona horaria inexistente", { timezone: "Mars/Olympus" }],
    ["un campo desconocido", { theme: "dark" }],
    ["un cuerpo vacío", {}],
    ["un cuerpo que no es JSON", "{"],
  ])("rechaza %s con 422", async (_, body) => {
    expect((await update(body)).status).toBe(422);
    expect(db.userPreference.upsert).not.toHaveBeenCalled();
  });

  it("superar el cupo de escrituras es 429", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 1000 }] as never);
    expect((await update({ currency: "USD" })).status).toBe(429);
    expect(db.userPreference.upsert).not.toHaveBeenCalled();
  });

  it("un fallo de la base de datos es 500", async () => {
    db.userPreference.upsert.mockRejectedValue(new Error("db down"));
    expect((await update({ currency: "USD" })).status).toBe(500);
  });
});
