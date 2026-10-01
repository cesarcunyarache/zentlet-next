import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DELETE } from "../[id]/route";
import { PUT } from "../[id]/limits/[effectiveFrom]/route";
import { GET, POST } from "../route";
import { scheduleBudgetCheck } from "@/features/budget/server/check";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/features/budget/server/check", () => ({ scheduleBudgetCheck: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    budget: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    budgetLimit: { upsert: vi.fn() },
    category: { findFirst: vi.fn() },
    subscription: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const ID = "5d0b7a3c-9e1f-4c2d-8a6b-3f4e5d6c7b8a";
const body = {
  id: ID,
  categoryId: "food",
  kind: "recurring",
  periodUnit: "month",
  periodCount: 1,
  startDate: "2026-09-01",
  amount: 600,
};
const row = (userId = "user-1", limits = [{ effectiveFrom: new Date("2026-09-01"), amount: "600.00" }]) => ({
  id: ID,
  categoryId: "food",
  kind: "recurring",
  periodUnit: "month",
  periodCount: 1,
  startDate: new Date("2026-09-01"),
  userId,
  limits,
});
const PRO = [{ status: "active", planKey: "pro", trialEndsAt: null, currentPeriodEnd: null }];
const uniqueViolation = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

const get = () => GET(new Request("http://localhost/api/budget"));
const post = (payload: unknown = body) =>
  POST(new Request("http://localhost/api/budget", { method: "POST", body: JSON.stringify(payload) }));
const put = (payload: unknown, effectiveFrom = "2026-10-01", id = ID) =>
  PUT(
    new Request(`http://localhost/api/budget/${id}/limits/${effectiveFrom}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id, effectiveFrom }) },
  );
const remove = (id = ID) =>
  DELETE(new Request(`http://localhost/api/budget/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.subscription.findMany.mockResolvedValue(PRO as never);
  db.budget.findUnique.mockResolvedValue(null);
  db.category.findFirst.mockResolvedValue({ id: "food" } as never);
  db.budget.create.mockResolvedValue(row() as never);
});

describe("GET /api/budget", () => {
  it("devuelve sólo los presupuestos del usuario, con montos como número y fechas cortas", async () => {
    db.budget.findMany.mockResolvedValue([row()] as never);

    const response = await get();

    expect(await response.json()).toEqual([
      {
        id: ID,
        categoryId: "food",
        kind: "recurring",
        periodUnit: "month",
        periodCount: 1,
        startDate: "2026-09-01",
        limits: [{ effectiveFrom: "2026-09-01", amount: 600 }],
      },
    ]);
    expect(db.budget.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
  });

  it("sin sesión es 401", async () => {
    getSession.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });
});

describe("POST /api/budget", () => {
  it("sin plan PRO es 403 y no crea nada", async () => {
    db.subscription.findMany.mockResolvedValue([]);

    const res = await post();

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ feature: "budgets" });
    expect(db.budget.create).not.toHaveBeenCalled();
  });

  it("crea el presupuesto con su primer tope desde el inicio del periodo", async () => {
    const response = await post();

    expect(response.status).toBe(201);
    expect(db.budget.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          id: ID,
          categoryId: "food",
          kind: "recurring",
          periodUnit: "month",
          periodCount: 1,
          startDate: new Date("2026-09-01"),
          userId: "user-1",
          limits: { create: { effectiveFrom: new Date("2026-09-01"), amount: 600 } },
          alerts: { create: [{ kind: "percent", value: 80 }] },
        },
      }),
    );
  });

  it("reenviar la misma alta devuelve la existente con 200 y no crea otra", async () => {
    db.budget.findUnique.mockResolvedValue(row() as never);
    expect((await post()).status).toBe(200);
    expect(db.budget.create).not.toHaveBeenCalled();
  });

  it("un id de otro usuario es 409 y no se pisa", async () => {
    db.budget.findUnique.mockResolvedValue(row("user-2") as never);
    expect((await post()).status).toBe(409);
    expect(db.budget.create).not.toHaveBeenCalled();
  });

  it("una categoría que no es del usuario es 422", async () => {
    db.category.findFirst.mockResolvedValue(null);
    expect((await post()).status).toBe(422);
    expect(db.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "food", userId: "user-1" } }),
    );
    expect(db.budget.create).not.toHaveBeenCalled();
  });

  it("si la categoría ya tiene presupuesto es 409", async () => {
    db.budget.create.mockRejectedValue(uniqueViolation);
    db.budget.findFirst.mockResolvedValue(null);

    const response = await post();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "Category already has a budget" });
  });

  it("dos envíos simultáneos del mismo alta: el segundo devuelve el ganador con 200", async () => {
    db.budget.create.mockRejectedValue(uniqueViolation);
    db.budget.findFirst.mockResolvedValue(row() as never);
    expect((await post()).status).toBe(200);
  });

  it("acepta semanal, quincenal, mensual, trimestral y anual, recurrentes o de una sola vez", async () => {
    const valid = [
      { periodUnit: "week", periodCount: 1, startDate: "2026-09-21" },
      { periodUnit: "half_month", periodCount: 1, startDate: "2026-09-16" },
      { periodUnit: "month", periodCount: 1, startDate: "2026-09-01" },
      { periodUnit: "month", periodCount: 3, startDate: "2026-07-01" },
      { periodUnit: "year", periodCount: 1, startDate: "2026-01-01" },
    ];
    for (const period of valid) {
      expect((await post({ ...body, ...period, kind: "once" })).status).toBe(201);
    }
  });

  it("rechaza periodos que no son una de las opciones", async () => {
    expect((await post({ ...body, periodUnit: "decade" })).status).toBe(422);
    expect((await post({ ...body, periodCount: 2 })).status).toBe(422);
    expect((await post({ ...body, kind: "forever" })).status).toBe(422);
    expect(db.budget.create).not.toHaveBeenCalled();
  });

  it("el inicio debe ser el primer día del periodo elegido", async () => {
    expect((await post({ ...body, startDate: "2026-09-15" })).status).toBe(422);
    expect((await post({ ...body, periodUnit: "week", startDate: "2026-09-22" })).status).toBe(422);
    expect((await post({ ...body, periodCount: 3, startDate: "2026-08-01" })).status).toBe(422);
    expect(db.budget.create).not.toHaveBeenCalled();
  });

  it("sin recurrencia explícita es recurrente", async () => {
    await post({ ...body, kind: undefined });
    expect(db.budget.create.mock.calls[0][0].data.kind).toBe("recurring");
  });

  it("un monto cero, negativo o desmesurado es 422", async () => {
    for (const amount of [0, -50, 10_000_000_000]) {
      expect((await post({ ...body, amount })).status).toBe(422);
    }
  });

  it("el userId del cuerpo se ignora: manda la sesión", async () => {
    await post({ ...body, userId: "user-2" });
    expect(db.budget.create.mock.calls[0][0].data.userId).toBe("user-1");
  });
});

describe("PUT /api/budget/[id]/limits/[effectiveFrom]", () => {
  it("sin plan PRO es 403 y no cambia el tope", async () => {
    db.subscription.findMany.mockResolvedValue([]);

    const res = await put({ amount: 700 });

    expect(res.status).toBe(403);
    expect(db.budgetLimit.upsert).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    db.budget.findFirst.mockResolvedValue({
      startDate: new Date("2026-09-01"),
      kind: "recurring",
      periodUnit: "month",
      periodCount: 1,
    } as never);
    db.budget.findUnique.mockResolvedValue(
      row("user-1", [
        { effectiveFrom: new Date("2026-09-01"), amount: "600.00" },
        { effectiveFrom: new Date("2026-10-01"), amount: "800.00" },
      ]) as never,
    );
  });

  it("fija el tope desde ese periodo y devuelve el presupuesto con su historial", async () => {
    const response = await put({ amount: 800 });

    expect(response.status).toBe(200);
    expect(db.budgetLimit.upsert).toHaveBeenCalledWith({
      where: { budgetId_effectiveFrom: { budgetId: ID, effectiveFrom: new Date("2026-10-01") } },
      create: { budgetId: ID, effectiveFrom: new Date("2026-10-01"), amount: 800 },
      update: { amount: 800 },
    });
    expect((await response.json()).limits).toEqual([
      { effectiveFrom: "2026-09-01", amount: 600 },
      { effectiveFrom: "2026-10-01", amount: 800 },
    ]);
    expect(scheduleBudgetCheck).toHaveBeenCalledWith("user-1", "food");
  });

  it("un presupuesto de otro usuario o inexistente es 404", async () => {
    db.budget.findFirst.mockResolvedValue(null);
    expect((await put({ amount: 800 })).status).toBe(404);
    expect(db.budgetLimit.upsert).not.toHaveBeenCalled();
  });

  it("una fecha que no inicia un periodo es 422", async () => {
    expect((await put({ amount: 800 }, "2026-10-15")).status).toBe(422);
    expect((await put({ amount: 800 }, "no-es-fecha")).status).toBe(422);
    expect(db.budgetLimit.upsert).not.toHaveBeenCalled();
  });

  it("un tope anterior a la creación del presupuesto es 422", async () => {
    expect((await put({ amount: 800 }, "2026-08-01")).status).toBe(422);
    expect(db.budgetLimit.upsert).not.toHaveBeenCalled();
  });

  it("un monto inválido es 422", async () => {
    expect((await put({ amount: 0 })).status).toBe(422);
  });

  it("la fecha debe iniciar un periodo del presupuesto, no de otro", async () => {
    db.budget.findFirst.mockResolvedValue({
      startDate: new Date("2026-09-21"),
      kind: "recurring",
      periodUnit: "week",
      periodCount: 1,
    } as never);
    expect((await put({ amount: 80 }, "2026-10-01")).status).toBe(422);
    expect((await put({ amount: 80 }, "2026-09-28")).status).toBe(200);
  });

  it("uno de una sola vez sólo admite topes en su periodo", async () => {
    db.budget.findFirst.mockResolvedValue({
      startDate: new Date("2026-09-01"),
      kind: "once",
      periodUnit: "month",
      periodCount: 1,
    } as never);
    expect((await put({ amount: 800 }, "2026-10-01")).status).toBe(422);
    expect((await put({ amount: 800 }, "2026-09-01")).status).toBe(200);
  });
});

describe("DELETE /api/budget/[id]", () => {
  it("borra el presupuesto del usuario con 204", async () => {
    db.budget.deleteMany.mockResolvedValue({ count: 1 });

    expect((await remove()).status).toBe(204);
    expect(db.budget.deleteMany).toHaveBeenCalledWith({ where: { id: ID, userId: "user-1" } });
  });

  it("si no existe (o es de otro usuario) es 404", async () => {
    db.budget.deleteMany.mockResolvedValue({ count: 0 });
    expect((await remove()).status).toBe(404);
  });

  it("superado el cupo de escrituras es 429", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 121 }] as never);
    expect((await remove()).status).toBe(429);
    expect(db.budget.deleteMany).not.toHaveBeenCalled();
  });
});
