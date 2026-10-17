// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { suggestTransactionCategory } from "../../../ai/actions/category-suggester";
import type { CategoryLike } from "../../../types";
import { useTransactionForm } from "../useTransactionForm";

vi.mock("../../../ai/actions/category-suggester", () => ({ suggestTransactionCategory: vi.fn() }));

const categories: CategoryLike[] = [
  { id: "food", name: "Comida", icon: "🍔", color: "#FDE68A" },
  { id: "health", name: "Salud", icon: "💊", color: "#D5F0DD" },
];

type Props = Parameters<typeof useTransactionForm>[0];

function renderForm(props: Partial<Props> = {}) {
  return renderHook((current: Props) => useTransactionForm(current), {
    initialProps: { isOpen: true, categories, ...props },
  });
}

beforeEach(() => {
  vi.mocked(suggestTransactionCategory).mockResolvedValue(null);
});

describe("useTransactionForm", () => {
  it("al abrir con un borrador carga sus valores y el monto escrito", async () => {
    const { result } = renderForm({ draft: { description: "Farmacia", amount: 25.5, categoryId: "health" } });

    await waitFor(() => expect(result.current.values.description).toBe("Farmacia"));
    expect(result.current.values).toMatchObject({ amount: 25.5, categoryId: "health", type: "expense" });
    expect(result.current.rawAmount).toBe("25.5");
  });

  it("la descripción elige sola la categoría y la marca como automática", async () => {
    const { result } = renderForm();

    act(() => result.current.changeDescription("Comida del mediodía"));

    await waitFor(() => expect(result.current.values.categoryId).toBe("food"));
    expect(result.current.autoCategoryId).toBe("food");
  });

  it("una categoría elegida a mano no la cambia una sugerencia posterior", async () => {
    const { result } = renderForm();

    act(() => result.current.selectCategory("health"));
    act(() => result.current.changeDescription("Comida del mediodía"));

    await waitFor(() => expect(result.current.values.description).toBe("Comida del mediodía"));
    expect(result.current.values.categoryId).toBe("health");
  });

  it("tocar la categoría elegida la quita", async () => {
    const { result } = renderForm();

    act(() => result.current.toggleCategory("food"));
    await waitFor(() => expect(result.current.values.categoryId).toBe("food"));

    act(() => result.current.toggleCategory("food"));
    await waitFor(() => expect(result.current.values.categoryId).toBe(""));
  });

  it("sólo se puede guardar con un monto mayor que cero y los campos válidos", async () => {
    const { result } = renderForm({ draft: { description: "Farmacia", categoryId: "health" } });
    await waitFor(() => expect(result.current.values.description).toBe("Farmacia"));
    expect(result.current.canSave).toBe(false);

    act(() => result.current.changeAmount("12.50"));

    await waitFor(() => expect(result.current.canSave).toBe(true));
    expect(result.current.values.amount).toBe(12.5);
  });

  it("la coma del monto se lee como separador de miles", async () => {
    const { result } = renderForm();

    act(() => result.current.changeAmount("1,250.50"));

    await waitFor(() => expect(result.current.values.amount).toBe(1250.5));
    expect(result.current.rawAmount).toBe("1250.50");
  });

  it("al volver a abrir olvida la repetición y la lista elegidas antes", async () => {
    const { result, rerender } = renderForm({ defaultListId: "private" });

    act(() => {
      result.current.changeRecurrence("MONTHLY");
      result.current.changeList("trip");
    });
    expect(result.current.recurrence).toBe("MONTHLY");

    rerender({ isOpen: false, categories, defaultListId: "private" });
    rerender({ isOpen: true, categories, defaultListId: "private" });

    expect(result.current.recurrence).toBeNull();
    expect(result.current.listId).toBe("private");
  });
});
