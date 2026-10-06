import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { POST as createTransaction } from "@/app/api/transaction/route";
import { DELETE as stopRoute, GET as getRoute } from "@/app/api/recurring-transaction/[id]/route";
import { GET as recurringCron } from "@/app/api/cron/recurring/route";
import { scheduleBudgetCheck } from "@/features/budget/server/check";
import { createUser, resetDatabase } from "@/test/integration/database";
import type { TTransaction } from "@/features/transaction/types";
import type { RecurrenceFrequency, TRecurringTransaction } from "../types";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/features/budget/server/check", () => ({ scheduleBudgetCheck: vi.fn() }));

const getSession = vi.mocked(auth.api.getSession);
const BASE_URL = "http://localhost";
const LIMA_NOON_OCT_6 = new Date("2026-10-06T17:00:00.000Z");

let userId: string;
let categoryId: string;

const signIn = (id: string) => getSession.mockResolvedValue({ user: { id } } as never);
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(transactionDate: string, recurrence?: RecurrenceFrequency, id: string = randomUUID()) {
  const response = await createTransaction(
    new Request(`${BASE_URL}/api/transaction`, {
      method: "POST",
      body: JSON.stringify({ id, description: "Netflix", amount: 45, type: "expense", categoryId, transactionDate, recurrence }),
    }),
  );
  return (await response.json()) as TTransaction;
}

async function recurringOf(transaction: TTransaction) {
  const response = await getRoute(new Request(`${BASE_URL}/api/recurring-transaction/x`), params(transaction.recurringTransactionId!));
  return (await response.json()) as TRecurringTransaction;
}

function runCron() {
  return recurringCron(
    new Request(`${BASE_URL}/api/cron/recurring`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }),
  );
}

const generatedDates = async (recurringTransactionId: string) =>
  (
    await prisma.transaction.findMany({
      where: { recurringTransactionId },
      orderBy: { transactionDate: "asc" },
      select: { transactionDate: true },
    })
  ).map((row) => row.transactionDate.toISOString().slice(0, 10));

beforeEach(async () => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(LIMA_NOON_OCT_6);
  await resetDatabase();
  userId = (await createUser()).id;
  signIn(userId);
  categoryId = (await prisma.category.create({ data: { userId, name: "Streaming", icon: "📺", color: "#E5E5E5" } })).id;
});

afterEach(() => vi.useRealTimers());

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe("movimientos recurrentes", () => {
  it("una sola vez no crea ninguna regla", async () => {
    const transaction = await create("2026-10-06");
    expect(transaction.recurringTransactionId).toBeNull();
    expect(await prisma.recurringTransaction.count()).toBe(0);
  });

  it("al repetir cada mes enlaza el primer movimiento y agenda el siguiente", async () => {
    const transaction = await create("2026-10-06", "MONTHLY");
    expect(transaction.recurringTransactionId).toEqual(expect.any(String));
    expect(await recurringOf(transaction)).toMatchObject({ frequency: "MONTHLY", nextDueDate: "2026-11-06" });
  });

  it("un primer movimiento con fecha pasada no rellena los periodos atrasados", async () => {
    const transaction = await create("2026-07-31", "MONTHLY");
    expect(await recurringOf(transaction)).toMatchObject({ nextDueDate: "2026-10-31" });
  });

  it("reenviar la misma alta desde la cola offline no duplica la regla", async () => {
    const id = randomUUID();
    await create("2026-10-06", "QUARTERLY", id);
    await create("2026-10-06", "QUARTERLY", id);
    expect(await prisma.recurringTransaction.count()).toBe(1);
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("el cron registra cada ocurrencia vencida una sola vez y revisa el presupuesto", async () => {
    const { recurringTransactionId } = await create("2026-10-06", "MONTHLY");
    vi.setSystemTime(new Date("2026-12-06T17:00:00.000Z"));

    expect(await (await runCron()).json()).toEqual({ created: 2, failed: 0 });
    expect(await (await runCron()).json()).toEqual({ created: 0, failed: 0 });

    expect(await generatedDates(recurringTransactionId!)).toEqual(["2026-10-06", "2026-11-06", "2026-12-06"]);
    expect(scheduleBudgetCheck).toHaveBeenCalledWith(userId, categoryId);
  });

  it("espera al día del usuario en su zona horaria", async () => {
    const { recurringTransactionId } = await create("2026-10-06", "WEEKLY");
    vi.setSystemTime(new Date("2026-10-13T03:00:00.000Z"));

    await runCron();
    expect(await generatedDates(recurringTransactionId!)).toEqual(["2026-10-06"]);
  });

  it("dejar de repetir conserva los movimientos y el cron ya no crea más", async () => {
    const transaction = await create("2026-10-06", "WEEKLY");
    const id = transaction.recurringTransactionId!;

    const stopped = await stopRoute(new Request(`${BASE_URL}/api/recurring-transaction/${id}`, { method: "DELETE" }), params(id));
    expect(stopped.status).toBe(204);
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } })).toMatchObject({
      recurringTransactionId: null,
    });

    vi.setSystemTime(new Date("2026-11-06T17:00:00.000Z"));
    await runCron();
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("nadie ve ni detiene la regla de otro usuario", async () => {
    const id = (await create("2026-10-06", "ANNUAL")).recurringTransactionId!;
    signIn((await createUser()).id);

    expect((await getRoute(new Request(`${BASE_URL}/x`), params(id))).status).toBe(404);
    expect((await stopRoute(new Request(`${BASE_URL}/x`, { method: "DELETE" }), params(id))).status).toBe(404);
    expect(await prisma.recurringTransaction.count()).toBe(1);
  });
});
