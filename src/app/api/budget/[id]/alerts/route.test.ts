import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { GET, PUT } from "./route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/features/budget/server/check", () => ({ scheduleBudgetCheck: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    budget: { findFirst: vi.fn() },
    budgetAlert: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    subscription: { findMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

const ID = "b1";
const PRO = [{ status: "active", planKey: "pro", trialEndsAt: null, currentPeriodEnd: null }];
const params = { params: Promise.resolve({ id: ID }) };
const url = `http://localhost/api/budget/${ID}/alerts`;
const put = (payload: unknown) => PUT(new Request(url, { method: "PUT", body: JSON.stringify(payload) }), params);

const saved = [
  { id: "a1", kind: "amount", value: { toString: () => "700.00" } },
  { id: "a2", kind: "percent", value: { toString: () => "90.00" } },
];

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.subscription.findMany.mockResolvedValue(PRO as never);
  db.budget.findFirst.mockResolvedValue({ categoryId: "food", limits: [{ amount: "1000.00" }] } as never);
  db.$transaction.mockResolvedValue([{ count: 1 }, { count: 2 }, saved] as never);
});

describe("GET /api/budget/[id]/alerts", () => {
  it("returns the alerts of the user's budget", async () => {
    db.budget.findFirst.mockResolvedValue({ alerts: saved } as never);

    const response = await GET(new Request(url), params);

    expect(await response.json()).toEqual([
      { id: "a1", kind: "amount", value: 700 },
      { id: "a2", kind: "percent", value: 90 },
    ]);
    expect(db.budget.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ID, userId: "user-1" } }));
  });
});

describe("PUT /api/budget/[id]/alerts", () => {
  it("replaces the alerts and re-checks the budget", async () => {
    const response = await put({ alerts: [{ kind: "percent", value: 90 }, { kind: "amount", value: 700 }] });

    expect(response.status).toBe(200);
    expect(db.budgetAlert.createMany).toHaveBeenCalledWith({
      data: [
        { kind: "percent", value: 90, budgetId: ID },
        { kind: "amount", value: 700, budgetId: ID },
      ],
    });
    expect(scheduleBudgetCheck).toHaveBeenCalledWith("user-1", "food");
  });

  it("rejects an amount at or above the current limit", async () => {
    expect((await put({ alerts: [{ kind: "amount", value: 1000 }] })).status).toBe(422);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects percents outside 1-99, duplicates and more than five alerts", async () => {
    const percent = (value: number) => ({ kind: "percent", value });

    expect((await put({ alerts: [percent(100)] })).status).toBe(422);
    expect((await put({ alerts: [percent(80.5)] })).status).toBe(422);
    expect((await put({ alerts: [percent(80), percent(80)] })).status).toBe(422);
    expect((await put({ alerts: [10, 20, 30, 40, 50, 60].map(percent) })).status).toBe(422);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for a budget of another user", async () => {
    db.budget.findFirst.mockResolvedValue(null);

    expect((await put({ alerts: [] })).status).toBe(404);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
