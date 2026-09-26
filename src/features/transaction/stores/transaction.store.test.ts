import { AxiosError, type AxiosResponse } from "axios";
import { MutationObserver, QueryClient, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitSyncError } from "@/core/offline/sync-events";
import { reportSyncFailure } from "@/core/offline/sync-policy";
import type { FeedData } from "../lib/feed-cache";
import { transactionService } from "../services/transaction.service";
import type { TTransaction, TransactionSummary } from "../types";
import {
  fetchSummaryWithPending,
  registerTransactionMutations,
  transactionKeys,
  transactionMutationKeys,
  withPendingInPage,
} from "./transaction.store";

/*
 * La cola offline con un QueryClient real y las mutaciones registradas
 * como en la app. Sólo se simula la capa HTTP.
 */

vi.mock("../services/transaction.service", () => ({
  transactionService: {
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    getSummary: vi.fn(),
    getTransactionPage: vi.fn(),
  },
}));
vi.mock("@/core/offline/sync-events", () => ({ emitSyncError: vi.fn() }));
vi.mock("@/core/offline/sync-policy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/offline/sync-policy")>()),
  reportSyncFailure: vi.fn(),
}));

const service = vi.mocked(transactionService);

function tx(overrides: Partial<TTransaction> = {}): TTransaction {
  return {
    id: "new",
    description: "Farmacia",
    amount: 25,
    type: "expense",
    categoryId: "health",
    transactionDate: "2026-09-20",
    ...overrides,
  };
}

const existing = tx({ id: "existing", amount: 10, categoryId: "food", transactionDate: "2026-09-10" });
const SEPTEMBER = { from: "2026-09-01", to: "2026-10-01" };
const SUMMARY: TransactionSummary = {
  count: 1,
  expenseTotal: 10,
  incomeTotal: 0,
  byCategory: { food: { expense: 10, income: 0 } },
};

function httpError(status: number) {
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
  registerTransactionMutations(queryClient);
  queryClient.mount(); // reanuda la cola al volver la red, como en la app
  const feed: FeedData = { pages: [{ items: [existing], nextCursor: null }], pageParams: [null] };
  queryClient.setQueryData(transactionKeys.list({}), feed);
  queryClient.setQueryData(transactionKeys.summary(SEPTEMBER), SUMMARY);
});

afterEach(() => {
  // desmontar antes de volver a "online": si no, se reanudaría la cola de este test en el siguiente
  queryClient.unmount();
  queryClient.clear();
  onlineManager.setOnline(true);
  vi.useRealTimers();
  vi.clearAllMocks();
});

function run<T>(mutationKey: readonly unknown[], variables: T) {
  const observer = new MutationObserver<unknown, unknown, T>(queryClient, { mutationKey });
  // la UI no espera la mutación: el resultado se observa en la cache
  void observer.mutate(variables).catch(() => {});
}

const feedIds = () => queryClient.getQueryData<FeedData>(transactionKeys.list({}))?.pages[0].items.map((item) => item.id);
const summary = () => queryClient.getQueryData<TransactionSummary>(transactionKeys.summary(SEPTEMBER));
const pending = () => queryClient.getMutationCache().findAll({ status: "pending" });
const settle = () => vi.waitFor(() => expect(pending()).toHaveLength(0));

describe("alta sin conexión", () => {
  it("aparece al instante en el feed y en los totales, y queda en cola sin llamar al servidor", async () => {
    onlineManager.setOnline(false);
    run(transactionMutationKeys.create, tx());

    await vi.waitFor(() => expect(feedIds()).toEqual(["new", "existing"]));
    expect(summary()).toMatchObject({ count: 2, expenseTotal: 35 });
    expect(pending()[0].state.isPaused).toBe(true);
    expect(service.createTransaction).not.toHaveBeenCalled();
  });

  it("al volver la red se envía una sola vez y el movimiento se conserva", async () => {
    service.createTransaction.mockResolvedValue(tx());
    onlineManager.setOnline(false);
    run(transactionMutationKeys.create, tx());
    await vi.waitFor(() => expect(pending()[0]?.state.isPaused).toBe(true));

    onlineManager.setOnline(true);
    await settle();

    expect(service.createTransaction).toHaveBeenCalledTimes(1);
    expect(service.createTransaction).toHaveBeenCalledWith(tx());
    expect(emitSyncError).not.toHaveBeenCalled();
  });
});

describe("rechazos del servidor", () => {
  it("un 422 revierte el alta en feed y totales, avisa a la UI y lo reporta", async () => {
    const rejection = httpError(422);
    service.createTransaction.mockRejectedValue(rejection);
    run(transactionMutationKeys.create, tx());
    await settle();

    expect(feedIds()).toEqual(["existing"]);
    expect(summary()).toMatchObject({ count: 1, expenseTotal: 10 });
    expect(service.createTransaction).toHaveBeenCalledTimes(1); // un 4xx no se reintenta
    expect(emitSyncError).toHaveBeenCalledWith("createTransaction");
    expect(reportSyncFailure).toHaveBeenCalledWith("createTransaction", rejection);
  });

  it("un fallo de red se reintenta y no revierte nada", async () => {
    vi.useFakeTimers();
    service.createTransaction
      .mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))
      .mockResolvedValueOnce(tx());
    run(transactionMutationKeys.create, tx());

    await vi.advanceTimersByTimeAsync(0);
    expect(feedIds()).toEqual(["new", "existing"]);

    await vi.advanceTimersByTimeAsync(2_000); // primer reintento
    expect(service.createTransaction).toHaveBeenCalledTimes(2);
    expect(pending()).toHaveLength(0);
    expect(feedIds()).toContain("new");
    expect(emitSyncError).not.toHaveBeenCalled();
  });

  it("borrar algo que ya no existe (404) cuenta como éxito", async () => {
    service.deleteTransaction.mockRejectedValue(httpError(404));
    run(transactionMutationKeys.remove, existing);
    await settle();

    expect(feedIds()).toEqual([]);
    expect(summary()).toMatchObject({ count: 0, expenseTotal: 0 });
    expect(emitSyncError).not.toHaveBeenCalled();
  });
});

describe("totales y páginas con cambios en cola", () => {
  async function queueOffline(...changes: [readonly unknown[], TTransaction][]) {
    onlineManager.setOnline(false);
    for (const [key, variables] of changes) run(key, variables);
    await vi.waitFor(() => expect(pending()).toHaveLength(changes.length));
  }

  it("suma un alta pendiente que el servidor todavía no tiene", async () => {
    await queueOffline([transactionMutationKeys.create, tx()]);
    service.getSummary.mockResolvedValue({ ...SUMMARY, presentIds: [] });

    const result = await fetchSummaryWithPending(queryClient, SEPTEMBER);

    expect(service.getSummary).toHaveBeenCalledWith(SEPTEMBER, ["new"]);
    expect(result).toMatchObject({ count: 2, expenseTotal: 35 });
  });

  it("no cuenta dos veces un alta que ya llegó al servidor (respuesta perdida, reenvío)", async () => {
    await queueOffline([transactionMutationKeys.create, tx()]);
    service.getSummary.mockResolvedValue({
      count: 2,
      expenseTotal: 35,
      incomeTotal: 0,
      byCategory: {},
      presentIds: ["new"],
    });

    expect(await fetchSummaryWithPending(queryClient, SEPTEMBER)).toMatchObject({ count: 2, expenseTotal: 35 });
  });

  it("resta un borrado pendiente sólo si el servidor aún lo tiene", async () => {
    await queueOffline([transactionMutationKeys.remove, existing]);

    service.getSummary.mockResolvedValueOnce({ ...SUMMARY, presentIds: ["existing"] });
    expect(await fetchSummaryWithPending(queryClient, SEPTEMBER)).toMatchObject({ count: 0, expenseTotal: 0 });

    service.getSummary.mockResolvedValueOnce({ ...SUMMARY, count: 0, expenseTotal: 0, presentIds: [] });
    expect(await fetchSummaryWithPending(queryClient, SEPTEMBER)).toMatchObject({ count: 0, expenseTotal: 0 });
  });

  it("ignora cambios pendientes fuera del periodo", async () => {
    await queueOffline([transactionMutationKeys.create, tx({ transactionDate: "2026-08-15" })]);
    service.getSummary.mockResolvedValue({ ...SUMMARY, presentIds: [] });

    const result = await fetchSummaryWithPending(queryClient, SEPTEMBER);

    expect(service.getSummary).toHaveBeenCalledWith(SEPTEMBER, []);
    expect(result).toMatchObject({ count: 1, expenseTotal: 10 });
  });

  it("una página recién traída conserva las altas en cola y oculta los borrados en cola", async () => {
    await queueOffline([transactionMutationKeys.create, tx()], [transactionMutationKeys.remove, existing]);
    const fromServer = { items: [existing, tx({ id: "other", transactionDate: "2026-09-01" })], nextCursor: null };

    expect(withPendingInPage(queryClient, fromServer, {}, true).items.map((item) => item.id)).toEqual(["new", "other"]);
    // las altas sólo se insertan en la primera página
    expect(withPendingInPage(queryClient, fromServer, {}, false).items.map((item) => item.id)).toEqual(["other"]);
  });
});

describe("edición", () => {
  const edit = (data: Partial<TTransaction>, previous: TTransaction | undefined = existing) =>
    run(transactionMutationKeys.update, { transactionId: existing.id, data, previous });
  const listOf = (filters: object) =>
    queryClient.getQueryData<FeedData>(transactionKeys.list(filters))?.pages[0].items.map((item) => item.id);

  it("cambiar de categoría mueve el importe de una barra a otra, sin tocar el total", async () => {
    onlineManager.setOnline(false);
    edit({ categoryId: "health" });

    await vi.waitFor(() =>
      expect(summary()?.byCategory).toEqual({ food: { expense: 0, income: 0 }, health: { expense: 10, income: 0 } }),
    );
    expect(summary()).toMatchObject({ count: 1, expenseTotal: 10, incomeTotal: 0 });
  });

  it("pasar de gasto a ingreso resta de gastos y suma a ingresos", async () => {
    onlineManager.setOnline(false);
    edit({ type: "income" });

    await vi.waitFor(() => expect(summary()).toMatchObject({ count: 1, expenseTotal: 0, incomeTotal: 10 }));
    expect(summary()?.byCategory.food).toEqual({ expense: 0, income: 10 });
  });

  it("sale de la lista filtrada que deja de cumplir y entra en la que ahora cumple", async () => {
    const empty: FeedData = { pages: [{ items: [], nextCursor: null }], pageParams: [null] };
    const withExisting: FeedData = { pages: [{ items: [existing], nextCursor: null }], pageParams: [null] };
    queryClient.setQueryData(transactionKeys.list({ categoryId: "food" }), withExisting);
    queryClient.setQueryData(transactionKeys.list({ categoryId: "health" }), empty);
    onlineManager.setOnline(false);
    edit({ categoryId: "health" });

    await vi.waitFor(() => expect(listOf({ categoryId: "health" })).toEqual(["existing"]));
    expect(listOf({ categoryId: "food" })).toEqual([]);
  });

  it("sin el movimiento en cache usa el que envía la vista para corregir los totales", async () => {
    queryClient.removeQueries({ queryKey: transactionKeys.lists });
    onlineManager.setOnline(false);
    edit({ amount: 40 });

    await vi.waitFor(() => expect(summary()).toMatchObject({ count: 1, expenseTotal: 40 }));
  });

  it("envía al servidor sólo lo que cambió", async () => {
    service.updateTransaction.mockResolvedValue({ ...existing, amount: 40 });
    edit({ amount: 40 });
    await settle();

    expect(service.updateTransaction).toHaveBeenCalledWith("existing", { amount: 40 });
  });

  it("un rechazo vuelve a pedir los datos al servidor, avisa y lo reporta", async () => {
    const rejection = httpError(422);
    service.updateTransaction.mockRejectedValue(rejection);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    edit({ amount: 40 });
    await settle();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: transactionKeys.all });
    expect(emitSyncError).toHaveBeenCalledWith("updateTransaction");
    expect(reportSyncFailure).toHaveBeenCalledWith("updateTransaction", rejection);
  });
});

describe("totales con ediciones en cola", () => {
  it("una edición en espera de red se descuenta como estaba y se suma como quedó", async () => {
    onlineManager.setOnline(false);
    run(transactionMutationKeys.update, {
      transactionId: "existing",
      data: { type: "income", categoryId: "salary" },
      previous: existing,
    });
    await vi.waitFor(() => expect(pending()[0]?.state.isPaused).toBe(true));
    service.getSummary.mockResolvedValue({ ...SUMMARY, presentIds: [] });

    const result = await fetchSummaryWithPending(queryClient, SEPTEMBER);

    // las ediciones no se preguntan al servidor: sólo altas y borrados
    expect(service.getSummary).toHaveBeenCalledWith(SEPTEMBER, []);
    expect(result).toMatchObject({ count: 1, expenseTotal: 0, incomeTotal: 10 });
    expect(result.byCategory.salary).toEqual({ expense: 0, income: 10 });
  });

  it("un alta en cola se cuenta ya con sus ediciones posteriores", async () => {
    onlineManager.setOnline(false);
    run(transactionMutationKeys.create, tx());
    run(transactionMutationKeys.update, { transactionId: "new", data: { amount: 100 }, previous: tx() });
    await vi.waitFor(() => expect(pending()).toHaveLength(2));
    service.getSummary.mockResolvedValue({ ...SUMMARY, presentIds: [] });

    // 10 del existente + 100 del alta editada; la edición no se cuenta aparte
    expect(await fetchSummaryWithPending(queryClient, SEPTEMBER)).toMatchObject({ count: 2, expenseTotal: 110 });
  });

  it("una edición que cambia la fecha a otro mes sale del periodo", async () => {
    onlineManager.setOnline(false);
    run(transactionMutationKeys.update, {
      transactionId: "existing",
      data: { transactionDate: "2026-08-30" },
      previous: existing,
    });
    await vi.waitFor(() => expect(pending()).toHaveLength(1));
    service.getSummary.mockResolvedValue({ ...SUMMARY, presentIds: [] });

    expect(await fetchSummaryWithPending(queryClient, SEPTEMBER)).toMatchObject({ count: 0, expenseTotal: 0 });
  });

  it("una edición guardada antes de este cambio (sin `previous`) no altera los totales", async () => {
    onlineManager.setOnline(false);
    run(transactionMutationKeys.update, { transactionId: "existing", data: { amount: 99 } });
    await vi.waitFor(() => expect(pending()).toHaveLength(1));
    service.getSummary.mockResolvedValue({ ...SUMMARY, presentIds: [] });

    expect(await fetchSummaryWithPending(queryClient, SEPTEMBER)).toMatchObject({ count: 1, expenseTotal: 10 });
  });

  it("una página recién traída aplica las ediciones en cola", async () => {
    onlineManager.setOnline(false);
    run(transactionMutationKeys.update, { transactionId: "existing", data: { amount: 77 }, previous: existing });
    await vi.waitFor(() => expect(pending()).toHaveLength(1));

    const page = withPendingInPage(queryClient, { items: [existing], nextCursor: null }, {}, true);
    expect(page.items[0].amount).toBe(77);
  });
});
