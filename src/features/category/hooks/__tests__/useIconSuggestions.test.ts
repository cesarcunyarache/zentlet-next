// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCategory } from "../../ai/actions/category-generator";
import { useIconSuggestions } from "../useIconSuggestions";

vi.mock("../../ai/actions/category-generator", () => ({ generateCategory: vi.fn() }));

const savedIcon = { icon: "🍔", color: "#111111" };
const otherSaved = { icon: "🛒", color: "#222222" };
const aiIcons = [
  { icon: "🚌", color: "#333333" },
  { icon: "🚕", color: "#444444" },
];
const category = { id: "c1", name: "Comida", icon: savedIcon.icon, color: savedIcon.color };

vi.mock("../../stores/category.store", () => ({
  useCategoryStore: () => ({ categories: [{ ...category, aiSuggestions: [otherSaved] }] }),
}));

beforeEach(() => {
  vi.mocked(generateCategory).mockResolvedValue({ categories: aiIcons } as never);
});

describe("useIconSuggestions al editar", () => {
  it("con el nombre original muestra primero el ícono guardado", () => {
    const { result } = renderHook(() =>
      useIconSuggestions({ name: "Comida", category, onIconsChange: vi.fn() }),
    );

    expect(result.current.icons).toEqual([savedIcon, otherSaved]);
  });

  it("al cambiar el nombre descarta el ícono guardado y muestra solo los resultados nuevos", async () => {
    const onIconsChange = vi.fn();
    const { result } = renderHook(() =>
      useIconSuggestions({ name: "Transporte", category, onIconsChange }),
    );

    await waitFor(() => expect(result.current.icons).toEqual(aiIcons));
    expect(onIconsChange).toHaveBeenLastCalledWith(aiIcons);
  });
});
