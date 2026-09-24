import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { POST } from "./route";

/*
 * Idempotencia del alta: el id lo genera el cliente y la cola offline puede
 * reenviar la misma alta (respuesta perdida, dos pestañas). Nunca debe
 * duplicarse ni pisar un movimiento de otro usuario.
 */

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: {
    transaction: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    category: { findFirst: vi.fn() },
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const ID = "7d3f1c2a-5b6e-4a8f-9c0d-1e2f3a4b5c6d";
const body = {
  id: ID,
  description: "Farmacia",
  amount: 25.5,
  type: "expense",
  categoryId: "health",
  transactionDate: "2026-09-20",
};

function row(userId: string) {
  return {
    ...body,
    amount: { toString: () => String(body.amount) },
    transactionDate: new Date(`${body.transactionDate}T00:00:00.000Z`),
    reference: null,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function post(payload: unknown = body) {
  return POST(
    new Request("http://localhost/api/transaction", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

function signIn(userId: string | null) {
  getSession.mockResolvedValue((userId ? { user: { id: userId } } : null) as never);
}

beforeEach(() => {
  vi.resetAllMocks();
  signIn("user-1");
  db.transaction.findUnique.mockResolvedValue(null);
  db.category.findFirst.mockResolvedValue({ id: "health" } as never);
  db.transaction.create.mockResolvedValue(row("user-1") as never);
});

describe("POST /api/transaction", () => {
  it("sin sesión responde 401 y no toca la base de datos", async () => {
    signIn(null);
    expect((await post()).status).toBe(401);
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("un cuerpo inválido es 422", async () => {
    const response = await post({ ...body, amount: -5 });
    expect(response.status).toBe(422);
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("un alta nueva es 201 y queda asociada al usuario de la sesión", async () => {
    const response = await post();

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: ID, amount: 25.5, transactionDate: "2026-09-20" });
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: ID, userId: "user-1", transactionDate: new Date("2026-09-20") }),
    });
  });

  it("reenviar la misma alta devuelve la existente con 200 y no crea otra", async () => {
    db.transaction.findUnique.mockResolvedValue(row("user-1") as never);

    const response = await post();

    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(ID);
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("un id que pertenece a otro usuario es 409 y no se revela ni se pisa", async () => {
    db.transaction.findUnique.mockResolvedValue(row("user-2") as never);

    const response = await post();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "Transaction id already in use" });
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("una categoría que no es del usuario es 422", async () => {
    db.category.findFirst.mockResolvedValue(null);

    expect((await post()).status).toBe(422);
    expect(db.category.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "health", userId: "user-1" } }));
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("carrera: si otra petición con el mismo id gana, se devuelve la ganadora con 200", async () => {
    db.transaction.create.mockRejectedValue(Object.assign(new Error("Unique constraint"), { code: "P2002" }));
    db.transaction.findFirst.mockResolvedValue(row("user-1") as never);

    const response = await post();

    expect(response.status).toBe(200);
    expect(db.transaction.findFirst).toHaveBeenCalledWith({ where: { id: ID, userId: "user-1" } });
  });

  it("carrera contra el mismo id de otro usuario: 409", async () => {
    db.transaction.create.mockRejectedValue(Object.assign(new Error("Unique constraint"), { code: "P2002" }));
    db.transaction.findFirst.mockResolvedValue(null);

    expect((await post()).status).toBe(409);
  });

  it("un fallo inesperado es 500 con un mensaje genérico", async () => {
    db.transaction.create.mockRejectedValue(new Error("connection reset: Farmacia 25.5"));

    const response = await post();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Error creating transaction" });
  });
});
