// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteConfirmation } from "../useDeleteConfirmation";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDeleteConfirmation", () => {
  it("pide confirmación y la retira sola a los 3,5 segundos", () => {
    const { result } = renderHook(() => useDeleteConfirmation("item-1"));

    act(() => result.current.requestConfirmation());
    expect(result.current.isConfirming).toBe(true);

    act(() => vi.advanceTimersByTime(3499));
    expect(result.current.isConfirming).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isConfirming).toBe(false);
  });

  it("al pasar a otro elemento se olvida la confirmación pendiente", () => {
    const { result, rerender } = renderHook(({ key }) => useDeleteConfirmation(key), {
      initialProps: { key: "item-1" as string | undefined },
    });

    act(() => result.current.requestConfirmation());
    rerender({ key: "item-2" });

    expect(result.current.isConfirming).toBe(false);
  });
});
