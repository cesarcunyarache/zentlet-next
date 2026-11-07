// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHomeFilters } from "../useHomeFilters";

const lists = [
  { id: "private", isPrivate: true, name: "Personal" },
  { id: "trip", isPrivate: false, name: "Viaje" },
];

vi.mock("@/features/list/stores/list.store", () => ({ useLists: () => ({ lists }) }));

const preferences = { feedPeriod: null as "month" | "previous" | "all" | null, setFeedPeriod: vi.fn() };
vi.mock("@/features/preference/hooks/useDisplayPreferences", () => ({ useDisplayPreferences: () => preferences }));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-16T12:00:00Z"), toFake: ["Date"] });
  preferences.feedPeriod = null;
  preferences.setFeedPeriod.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("useHomeFilters", () => {
  it("empieza mostrando todo, en la lista privada y sin otros filtros", () => {
    const { result } = renderHook(() => useHomeFilters());

    expect(result.current.period).toBe("all");
    expect(result.current.listId).toBe("private");
    expect(result.current.feedFilters).toMatchObject({ listId: "private", type: undefined, categoryId: undefined });
  });

  it("arranca en el periodo guardado en las preferencias", () => {
    preferences.feedPeriod = "month";

    const { result } = renderHook(() => useHomeFilters());

    expect(result.current.period).toBe("month");
  });

  it("al elegir un periodo se guarda para la próxima vez", () => {
    const { result } = renderHook(() => useHomeFilters());

    act(() => result.current.changePeriod("previous"));

    expect(result.current.period).toBe("previous");
    expect(preferences.setFeedPeriod).toHaveBeenCalledWith("previous");
  });

  it("mostrar todo tras guardar un movimiento no cambia el periodo guardado", () => {
    preferences.feedPeriod = "month";
    const { result } = renderHook(() => useHomeFilters());

    act(() => result.current.showAll());

    expect(result.current.period).toBe("all");
    expect(preferences.setFeedPeriod).not.toHaveBeenCalled();
  });

  it("cambiar de periodo o de lista quita la categoría elegida", () => {
    const { result } = renderHook(() => useHomeFilters());

    act(() => result.current.changeCategory("food"));
    act(() => result.current.changePeriod("previous"));
    expect(result.current.categoryId).toBeNull();

    act(() => result.current.changeCategory("food"));
    act(() => result.current.changeList("trip"));
    expect(result.current.categoryId).toBeNull();
    expect(result.current.listId).toBe("trip");
    expect(result.current.summaryFilters.listId).toBe("trip");
  });

  it("una lista que ya no existe vuelve a la privada", () => {
    const { result } = renderHook(() => useHomeFilters());

    act(() => result.current.changeList("borrada"));

    expect(result.current.listId).toBe("private");
  });

  it("al guardar un movimiento se vuelve a mostrar todo, sin tipo ni categoría", () => {
    const { result } = renderHook(() => useHomeFilters());

    act(() => {
      result.current.changePeriod("previous");
      result.current.changeKind("income");
      result.current.changeCategory("salary");
    });
    act(() => result.current.showAll());

    expect(result.current).toMatchObject({ period: "all", kind: null, categoryId: null });
  });

  it("cerrar la búsqueda borra lo escrito", () => {
    const { result } = renderHook(() => useHomeFilters());

    act(() => result.current.toggleSearch());
    act(() => result.current.changeQuery("café"));
    expect(result.current.isSearching).toBe(true);

    act(() => result.current.toggleSearch());

    expect(result.current.isSearching).toBe(false);
    expect(result.current.query).toBe("");
  });
});
