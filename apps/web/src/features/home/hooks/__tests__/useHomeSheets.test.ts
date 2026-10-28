// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHomeSheets } from "../useHomeSheets";

describe("useHomeSheets", () => {
  it("abre un solo sheet a la vez y lo cierra desde el propio sheet", () => {
    const { result } = renderHook(() => useHomeSheets());

    act(() => result.current.open("settings"));
    expect(result.current.sheetProps("settings").isOpen).toBe(true);

    act(() => result.current.sheetProps("inbox").onOpenChange(true));
    expect(result.current.sheetProps("settings").isOpen).toBe(false);
    expect(result.current.sheetProps("inbox").isOpen).toBe(true);

    act(() => result.current.sheetProps("inbox").onOpenChange(false));
    expect(result.current.sheetProps("inbox").isOpen).toBe(false);
  });
});
