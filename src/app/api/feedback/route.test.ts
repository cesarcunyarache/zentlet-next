import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { FEEDBACK_MAX_LENGTH } from "@/features/feedback/constants";
import { POST } from "./route";

/*
 * Comentarios desde Ajustes: sólo con sesión, con cupo propio por usuario
 * y sin guardar nada del contexto que no sea técnico.
 */

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: {
    feedback: { create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const post = (payload: unknown) =>
  POST(new Request("http://localhost/api/feedback", { method: "POST", body: JSON.stringify(payload) }));
const saved = () => db.feedback.create.mock.calls[0][0].data;

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.feedback.create.mockResolvedValue({ id: "fb-1" } as never);
});

describe("POST /api/feedback", () => {
  it("guarda el comentario del usuario de la sesión, recortado y como `comment` por defecto", async () => {
    const response = await post({ message: "  Me encanta el dictado  " });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "fb-1" });
    expect(saved()).toEqual({ message: "Me encanta el dictado", type: "comment", context: undefined, userId: "user-1" });
  });

  it("guarda el contexto técnico y descarta cualquier otro campo", async () => {
    await post({
      message: "La lista no carga",
      context: { locale: "es", path: "/admin", userAgent: "Mozilla/5.0", online: true, amount: 1200, email: "x@y.z" },
    });

    expect(saved().context).toEqual({ locale: "es", path: "/admin", userAgent: "Mozilla/5.0", online: true });
  });

  it("acepta los tipos definidos en el código y rechaza los demás", async () => {
    expect((await post({ message: "Falla al guardar", type: "bug" })).status).toBe(201);
    expect((await post({ message: "Algo", type: "billing" })).status).toBe(422);
  });

  it("un mensaje vacío o demasiado largo es 422 y no se guarda", async () => {
    expect((await post({ message: "   " })).status).toBe(422);
    expect((await post({ message: "x".repeat(FEEDBACK_MAX_LENGTH + 1) })).status).toBe(422);
    expect(db.feedback.create).not.toHaveBeenCalled();
  });

  it("el userId del cuerpo se ignora: manda la sesión", async () => {
    await post({ message: "Hola", userId: "user-2" });
    expect(saved().userId).toBe("user-1");
  });

  it("sin sesión es 401 y no gasta cupo", async () => {
    getSession.mockResolvedValue(null);
    expect((await post({ message: "Hola" })).status).toBe(401);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("superado el cupo por hora es 429 y no se guarda", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 11 }] as never);
    expect((await post({ message: "Otro más" })).status).toBe(429);
    expect(db.feedback.create).not.toHaveBeenCalled();
  });

  it("si la base de datos falla es 500 con mensaje genérico", async () => {
    db.feedback.create.mockRejectedValue(new Error("connection lost"));
    const response = await post({ message: "Hola" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Error sending feedback" });
  });
});
