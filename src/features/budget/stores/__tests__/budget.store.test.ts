import { AxiosError, type AxiosResponse } from "axios";
import { MutationObserver, QueryClient, QueryObserver, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitSyncError } from "@/core/offline/sync-events";
import { reportSyncFailure } from "@/core/offline/sync-policy";
import { budgetService, type CreateBudgetPayload } from "../../services/budget.service";
import type { TBudget } from "../../types";
import { budgetKeys, budgetMutationKeys, fetchBudgetsWithPending, registerBudgetMutations } from "../budget.store";

vi.mock("../../services/budget.service", () => ({
  budgetService: {
    getBudgets: vi.fn(),
    createBudget: vi.fn(),
    setBudgetLimit: vi.fn(),
    deleteBudget: vi.fn(),
  },
}));
vi.mock("@/core/offline/sync-events", () => ({ emitSyncError: vi.fn() }));
vi.mock("@/core/offline/sync-policy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/offline/sync-policy")>()),
  reportSyncFailure: vi.fn(),
}));

const service = vi.mocked(budgetService);

const food: TBudget = {
  id: "budget-food",
  categoryId: "food",
  kind: "recurring",
  periodUnit: "month",
  periodCount: 1,
  startDate: "2026-08-01",
  limits: [{ effectiveFrom: "2026-08-01", amount: 600 }],
};
const health: CreateBudgetPayload = {
  id: "budget-health",
  categoryId: "health",
  kind: "once",
  periodUnit: "month",
  periodCount: 1,
  startDate: "2026-09-01",
  amount: 200,
};
const raise = { budgetId: food.id, effectiveFrom: "2026-09-01", amount: 800 };

function httpError(status: number) {
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
  registerBudgetMutations(queryClient);
  queryClient.mount();
  queryClient.setQueryData(budgetKeys.all, [food]);
});

afterEach(() => {
  queryClient.unmount();
  queryClient.clear();
  onlineManager.setOnline(true);
  vi.clearAllMocks();
});

function run<T>(mutationKey: readonly unknown[], variables: T) {
  const observer = new MutationObserver<unknown, unknown, T>(queryClient, { mutationKey });
  void observer.mutate(variables).catch(() => {});
}

const budgets = () => queryClient.getQueryData<TBudget[]>(budgetKeys.all) ?? [];
const budget = (id: string) => budgets().find((item) => item.id === id);
const pending = () => queryClient.getMutationCache().findAll({ status: "pending" });
const settle = () => vi.waitFor(() => expect(pending()).toHaveLength(0));

function watchList() {
  return new QueryObserver(queryClient, {
    queryKey: budgetKeys.all,
    queryFn: () => budgetService.getBudgets(),
    staleTime: Infinity,
  }).subscribe(() => {});
}

describe("alta de presupuesto", () => {
  it("sin conexión aparece al instante con su primer tope y queda en cola", async () => {
    onlineManager.setOnline(false);
    run(budgetMutationKeys.create, health);

    await vi.waitFor(() => expect(budget(health.id)?.limits).toEqual([{ effectiveFrom: "2026-09-01", amount: 200 }]));
    expect(pending()[0].state.isPaused).toBe(true);
    expect(service.createBudget).not.toHaveBeenCalled();
  });

  it("al volver la red se envía una sola vez", async () => {
    service.createBudget.mockResolvedValue({ ...food, id: health.id });
    onlineManager.setOnline(false);
    run(budgetMutationKeys.create, health);
    await vi.waitFor(() => expect(pending()[0]?.state.isPaused).toBe(true));

    onlineManager.setOnline(true);
    await settle();

    expect(service.createBudget).toHaveBeenCalledTimes(1);
    expect(service.createBudget).toHaveBeenCalledWith(health);
  });

  it("si otro dispositivo ya le puso presupuesto (409): se quita, avisa y NO lo reporta como fallo", async () => {
    service.createBudget.mockRejectedValue(httpError(409));
    service.getBudgets.mockResolvedValue([food]);
    run(budgetMutationKeys.create, health);
    await settle();

    expect(budget(health.id)).toBeUndefined();
    expect(emitSyncError).toHaveBeenCalledWith("budgetExists");
    expect(reportSyncFailure).not.toHaveBeenCalled();
  });

  it("otro rechazo (422) lo quita, avisa y lo reporta", async () => {
    const rejection = httpError(422);
    service.createBudget.mockRejectedValue(rejection);
    run(budgetMutationKeys.create, health);
    await settle();

    expect(budget(health.id)).toBeUndefined();
    expect(emitSyncError).toHaveBeenCalledWith("createBudget");
    expect(reportSyncFailure).toHaveBeenCalledWith("createBudget", rejection);
  });
});

describe("cambio de tope", () => {
  it("se aplica al instante desde su periodo, conservando los anteriores", async () => {
    onlineManager.setOnline(false);
    run(budgetMutationKeys.limit, raise);

    await vi.waitFor(() =>
      expect(budget(food.id)?.limits).toEqual([
        { effectiveFrom: "2026-08-01", amount: 600 },
        { effectiveFrom: "2026-09-01", amount: 800 },
      ]),
    );
  });

  it("envía el periodo elegido en el dispositivo, no el del momento de sincronizar", async () => {
    service.setBudgetLimit.mockResolvedValue(food);
    run(budgetMutationKeys.limit, raise);
    await settle();

    expect(service.setBudgetLimit).toHaveBeenCalledWith(food.id, "2026-09-01", 800);
  });

  it("un rechazo vuelve a pedir los datos al servidor, avisa y lo reporta", async () => {
    const rejection = httpError(422);
    service.setBudgetLimit.mockRejectedValue(rejection);
    service.getBudgets.mockResolvedValue([food]);
    const unsubscribe = watchList();
    run(budgetMutationKeys.limit, raise);
    await settle();

    await vi.waitFor(() => expect(budget(food.id)?.limits).toEqual(food.limits));
    unsubscribe();
    expect(emitSyncError).toHaveBeenCalledWith("updateBudget");
    expect(reportSyncFailure).toHaveBeenCalledWith("updateBudget", rejection);
  });
});

describe("borrado de presupuesto", () => {
  it("desaparece al instante", async () => {
    onlineManager.setOnline(false);
    run(budgetMutationKeys.remove, food.id);
    await vi.waitFor(() => expect(budgets()).toEqual([]));
  });

  it("si ya no existía (404) cuenta como éxito", async () => {
    service.deleteBudget.mockRejectedValue(httpError(404));
    run(budgetMutationKeys.remove, food.id);
    await settle();

    expect(budgets()).toEqual([]);
    expect(emitSyncError).not.toHaveBeenCalled();
  });

  it("otro rechazo vuelve a pedir los datos, avisa y lo reporta", async () => {
    service.deleteBudget.mockRejectedValue(httpError(403));
    service.getBudgets.mockResolvedValue([food]);
    const unsubscribe = watchList();
    run(budgetMutationKeys.remove, food.id);
    await settle();

    await vi.waitFor(() => expect(budgets()).toEqual([food]));
    unsubscribe();
    expect(emitSyncError).toHaveBeenCalledWith("deleteBudget");
  });
});

describe("cambio de periodo", () => {
  it("borra el presupuesto anterior antes de crear el nuevo, en ese orden", async () => {
    const calls: string[] = [];
    service.deleteBudget.mockImplementation(async () => {
      calls.push("delete");
    });
    service.createBudget.mockImplementation(async () => {
      calls.push("create");
      return food;
    });
    const weekly = { ...health, id: "budget-food-weekly", categoryId: "food", periodUnit: "week" as const, startDate: "2026-09-21" };

    run(budgetMutationKeys.remove, food.id);
    run(budgetMutationKeys.create, weekly);
    await settle();

    expect(calls).toEqual(["delete", "create"]);
    expect(budgets().map((item) => item.id)).toEqual([weekly.id]);
  });
});

describe("recarga con cambios en cola", () => {
  it("conserva altas, topes y borrados que el servidor aún no tiene", async () => {
    const rent: TBudget = { ...food, id: "budget-rent", categoryId: "rent" };
    service.getBudgets.mockResolvedValue([food, rent]);
    onlineManager.setOnline(false);
    run(budgetMutationKeys.create, health);
    run(budgetMutationKeys.limit, raise);
    run(budgetMutationKeys.remove, rent.id);
    await vi.waitFor(() => expect(pending()).toHaveLength(3));

    const fetched = await fetchBudgetsWithPending(queryClient);

    expect(fetched.map((item) => item.id)).toEqual([food.id, health.id]);
    expect(fetched[0].limits.at(-1)).toEqual({ effectiveFrom: "2026-09-01", amount: 800 });
  });

  it("no duplica un alta que ya llegó al servidor", async () => {
    const created: TBudget = { ...food, id: health.id, categoryId: "health" };
    service.getBudgets.mockResolvedValue([food, created]);
    onlineManager.setOnline(false);
    run(budgetMutationKeys.create, health);
    await vi.waitFor(() => expect(pending()).toHaveLength(1));

    expect((await fetchBudgetsWithPending(queryClient)).map((item) => item.id)).toEqual([food.id, health.id]);
  });

  it("la lista observada se sirve con los cambios pendientes aplicados", async () => {
    service.getBudgets.mockResolvedValue([]);
    onlineManager.setOnline(false);
    run(budgetMutationKeys.create, health);
    onlineManager.setOnline(true);
    service.createBudget.mockImplementation(() => new Promise(() => {}));

    const observer = new QueryObserver(queryClient, {
      queryKey: budgetKeys.all,
      queryFn: () => fetchBudgetsWithPending(queryClient),
      staleTime: 0,
    });
    const result = await observer.refetch();

    expect((result.data as TBudget[]).map((item) => item.id)).toContain(health.id);
  });
});
