import { AxiosError, type AxiosResponse } from "axios";
import { MutationObserver, QueryClient, QueryObserver, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitSyncError } from "@/core/offline/sync-events";
import { reportSyncFailure } from "@/core/offline/sync-policy";
import { categoryService } from "../services/category.service";
import type { TCategory } from "../types";
import { categoryKeys, categoryMutationKeys, registerCategoryMutations } from "./category.store";

/*
 * La cola offline de categorías con un QueryClient real y las mutaciones
 * registradas como en la app. Sólo se simula la capa HTTP.
 */

vi.mock("../services/category.service", () => ({
  categoryService: {
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getCategories: vi.fn(),
    getCategory: vi.fn(),
  },
}));
vi.mock("@/core/offline/sync-events", () => ({ emitSyncError: vi.fn() }));
vi.mock("@/core/offline/sync-policy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/offline/sync-policy")>()),
  reportSyncFailure: vi.fn(),
}));

const service = vi.mocked(categoryService);

const food: TCategory = {
  id: "food",
  name: "Comida",
  icon: "🍽️",
  color: "#FBDDD5",
  description: null,
  userId: "user-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};
const health = { id: "health", name: "Salud", icon: "💊", color: "#D5F0DD" };

function httpError(status: number) {
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
  registerCategoryMutations(queryClient);
  queryClient.mount();
  queryClient.setQueryData(categoryKeys.all, [food]);
});

afterEach(() => {
  // desmontar antes de volver a "online": si no, se reanudaría la cola de este test en el siguiente
  queryClient.unmount();
  queryClient.clear();
  onlineManager.setOnline(true);
  vi.clearAllMocks();
});

function run<T>(mutationKey: readonly unknown[], variables: T) {
  const observer = new MutationObserver<unknown, unknown, T>(queryClient, { mutationKey });
  void observer.mutate(variables).catch(() => {});
}

const listIds = () => queryClient.getQueryData<TCategory[]>(categoryKeys.all)?.map((category) => category.id);
const pending = () => queryClient.getMutationCache().findAll({ status: "pending" });
const settle = () => vi.waitFor(() => expect(pending()).toHaveLength(0));

describe("alta de categoría", () => {
  it("sin conexión aparece al instante y queda en cola sin llamar al servidor", async () => {
    onlineManager.setOnline(false);
    run(categoryMutationKeys.create, health);

    await vi.waitFor(() => expect(listIds()).toEqual(["health", "food"]));
    expect(pending()[0].state.isPaused).toBe(true);
    expect(service.createCategory).not.toHaveBeenCalled();
  });

  it("al volver la red se envía una sola vez", async () => {
    service.createCategory.mockResolvedValue({ ...food, ...health });
    onlineManager.setOnline(false);
    run(categoryMutationKeys.create, health);
    await vi.waitFor(() => expect(pending()[0]?.state.isPaused).toBe(true));

    onlineManager.setOnline(true);
    await settle();

    expect(service.createCategory).toHaveBeenCalledTimes(1);
    expect(emitSyncError).not.toHaveBeenCalled();
  });

  it("un rechazo del servidor la quita de la lista, avisa y lo reporta", async () => {
    const rejection = httpError(422);
    service.createCategory.mockRejectedValue(rejection);
    run(categoryMutationKeys.create, health);
    await settle();

    expect(listIds()).toEqual(["food"]);
    expect(emitSyncError).toHaveBeenCalledWith("createCategory");
    expect(reportSyncFailure).toHaveBeenCalledWith("createCategory", rejection);
  });
});

describe("borrado de categoría", () => {
  it("con movimientos (409): vuelve a la lista, avisa «en uso» y NO lo reporta como fallo", async () => {
    service.deleteCategory.mockRejectedValue(httpError(409));
    service.getCategories.mockResolvedValue([food]);
    // como en la app: la lista está en pantalla, así que al invalidarse se vuelve a pedir
    const unsubscribe = new QueryObserver(queryClient, {
      queryKey: categoryKeys.all,
      queryFn: () => categoryService.getCategories(),
      staleTime: Infinity,
    }).subscribe(() => {});
    run(categoryMutationKeys.remove, "food");
    await settle();

    expect(emitSyncError).toHaveBeenCalledWith("categoryInUse");
    expect(reportSyncFailure).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(listIds()).toEqual(["food"]));
    unsubscribe();
  });

  it("si ya no existía (404) cuenta como éxito", async () => {
    service.deleteCategory.mockRejectedValue(httpError(404));
    run(categoryMutationKeys.remove, "food");
    await settle();

    expect(listIds()).toEqual([]);
    expect(emitSyncError).not.toHaveBeenCalled();
  });

  it("un 429 (cupo de escrituras) no revierte: queda reintentándose", async () => {
    vi.useFakeTimers();
    service.deleteCategory.mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce(undefined);
    run(categoryMutationKeys.remove, "food");

    await vi.advanceTimersByTimeAsync(0);
    expect(listIds()).toEqual([]);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(service.deleteCategory).toHaveBeenCalledTimes(2);
    expect(emitSyncError).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
