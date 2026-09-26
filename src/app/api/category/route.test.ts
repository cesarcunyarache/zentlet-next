import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { DELETE, PATCH } from "./[id]/route";
import { POST } from "./route";

/*
 * Categorías: alta idempotente por id (como los movimientos), tope por
 * usuario y borrado protegido cuando la categoría tiene movimientos.
 */

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const ID = "0b9c4d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
const body = { id: ID, name: "Salud", icon: "💊", color: "#D5F0DD" };
const row = (userId: string) => ({ ...body, description: null, userId, createdAt: new Date(), updatedAt: new Date() });

const post = (payload: unknown = body) =>
  POST(new Request("http://localhost/api/category", { method: "POST", body: JSON.stringify(payload) }));
const patch = (payload: unknown, id = ID) =>
  PATCH(new Request(`http://localhost/api/category/${id}`, { method: "PATCH", body: JSON.stringify(payload) }), {
    params: Promise.resolve({ id }),
  });
const remove = (id = ID) =>
  DELETE(new Request(`http://localhost/api/category/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.category.findUnique.mockResolvedValue(null);
  db.category.count.mockResolvedValue(3);
  db.category.create.mockResolvedValue(row("user-1") as never);
});

describe("POST /api/category", () => {
  it("un alta nueva es 201 y queda asociada al usuario de la sesión", async () => {
    const response = await post();
    expect(response.status).toBe(201);
    expect(db.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: ID, userId: "user-1", description: null }),
    });
  });

  it("reenviar la misma alta devuelve la existente con 200 y no crea otra", async () => {
    db.category.findUnique.mockResolvedValue(row("user-1") as never);
    expect((await post()).status).toBe(200);
    expect(db.category.create).not.toHaveBeenCalled();
  });

  it("un id de otro usuario es 409 y no se pisa", async () => {
    db.category.findUnique.mockResolvedValue(row("user-2") as never);
    expect((await post()).status).toBe(409);
    expect(db.category.create).not.toHaveBeenCalled();
  });

  it("con 200 categorías no se crean más", async () => {
    db.category.count.mockResolvedValue(200);
    const response = await post();
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ message: "Category limit reached" });
    expect(db.category.create).not.toHaveBeenCalled();
  });

  it("reenviar una categoría ya creada funciona aunque se haya alcanzado el tope", async () => {
    db.category.findUnique.mockResolvedValue(row("user-1") as never);
    db.category.count.mockResolvedValue(200);
    expect((await post()).status).toBe(200);
  });

  it("carrera: si otra petición con el mismo id gana, se devuelve la ganadora", async () => {
    db.category.create.mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));
    db.category.findFirst.mockResolvedValue(row("user-1") as never);
    expect((await post()).status).toBe(200);
  });

  it("un nombre vacío o demasiado largo es 422", async () => {
    expect((await post({ ...body, name: "  " })).status).toBe(422);
    expect((await post({ ...body, name: "x".repeat(61) })).status).toBe(422);
  });
});

describe("DELETE /api/category/[id]", () => {
  it("borra sólo categorías del usuario de la sesión", async () => {
    db.category.deleteMany.mockResolvedValue({ count: 1 });
    expect((await remove()).status).toBe(204);
    expect(db.category.deleteMany).toHaveBeenCalledWith({ where: { id: ID, userId: "user-1" } });
  });

  it("si no existe es 404 (el cliente lo trata como éxito)", async () => {
    db.category.deleteMany.mockResolvedValue({ count: 0 });
    expect((await remove()).status).toBe(404);
  });

  it("con movimientos es 409, no 500", async () => {
    db.category.deleteMany.mockRejectedValue(Object.assign(new Error("FK"), { code: "P2003" }));
    const response = await remove();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "Category has transactions" });
  });
});

describe("sugerencias de la IA guardadas con la categoría", () => {
  const stored = () => db.category.create.mock.calls[0][0].data.aiSuggestions;

  it("se guardan saneadas: sin emojis compuestos ni repetidos y con colores pastel", async () => {
    await post({
      ...body,
      aiSuggestions: [
        { icon: "💊", color: "#FF0000" },
        { icon: "💊", color: "#D5F0DD" },
        { icon: "👨‍⚕️", color: "#D5F0DD" },
        { icon: "🏥", color: "#CFE3F7" },
      ],
    });

    expect(stored()).toEqual([
      { icon: "💊", color: expect.stringMatching(/^#[0-9A-F]{6}$/) },
      { icon: "🏥", color: "#CFE3F7" },
    ]);
    expect((stored() as { color: string }[])[0].color).not.toBe("#FF0000");
  });

  it("sin sugerencias (o ninguna válida) la columna queda en NULL", async () => {
    await post(body);
    expect(stored()).toBe(Prisma.DbNull);

    vi.mocked(db.category.create).mockClear();
    await post({ ...body, aiSuggestions: [{ icon: "texto", color: "#000000" }] });
    expect(stored()).toBe(Prisma.DbNull);
  });

  it("más de 4 opciones es 422", async () => {
    const five = Array.from({ length: 5 }, () => ({ icon: "💊", color: "#D5F0DD" }));
    expect((await post({ ...body, aiSuggestions: five })).status).toBe(422);
    expect(db.category.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/category/[id]", () => {
  const data = () => db.category.updateMany.mock.calls[0][0].data;

  beforeEach(() => {
    db.category.updateMany.mockResolvedValue({ count: 1 });
    db.category.findUnique.mockResolvedValue(row("user-1") as never);
  });

  it("sólo actualiza categorías del usuario de la sesión", async () => {
    expect((await patch({ name: "Farmacia" })).status).toBe(200);
    expect(db.category.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ID, userId: "user-1" } }),
    );
  });

  it("sin `aiSuggestions` no toca las guardadas", async () => {
    await patch({ name: "Farmacia" });
    expect(data()).not.toHaveProperty("aiSuggestions");
  });

  it("con `aiSuggestions` las reemplaza, saneadas", async () => {
    await patch({ name: "Mascota", aiSuggestions: [{ icon: "🐶", color: "#CFE3F7" }, { icon: "🐶", color: "#FDDCC4" }] });
    expect(data().aiSuggestions).toEqual([{ icon: "🐶", color: "#CFE3F7" }]);
  });

  it("con `aiSuggestions: null` las borra", async () => {
    await patch({ aiSuggestions: null });
    expect(data().aiSuggestions).toBe(Prisma.DbNull);
  });

  it("si no existe o es de otro usuario es 404", async () => {
    db.category.updateMany.mockResolvedValue({ count: 0 });
    expect((await patch({ name: "Farmacia" })).status).toBe(404);
  });

  it("sin sesión es 401 y no escribe", async () => {
    getSession.mockResolvedValue(null);
    expect((await patch({ name: "Farmacia" })).status).toBe(401);
    expect(db.category.updateMany).not.toHaveBeenCalled();
  });
});
