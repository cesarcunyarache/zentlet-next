// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "../useToast";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useToast", () => {
  it("muestra el mensaje y lo oculta pasado el tiempo", () => {
    const { result } = renderHook(() => useToast());

    act(() => result.current.show("Guardado"));
    expect(result.current.message).toBe("Guardado");

    act(() => vi.advanceTimersByTime(1900));
    expect(result.current.message).toBeNull();
  });

  it("un mensaje nuevo reinicia el tiempo en vez de cortarse con el anterior", () => {
    const { result } = renderHook(() => useToast());

    act(() => result.current.show("Primero"));
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.show("Segundo"));
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.message).toBe("Segundo");
  });
});
