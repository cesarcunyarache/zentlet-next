import { describe, expect, it } from "vitest";
import { mergeSyncStates } from "./pending-transactions";

describe("mergeSyncStates", () => {
  it("agrupa por movimiento e ignora cambios sin id o sin estado offline", () => {
    const result = mergeSyncStates([
      { id: "a", state: "syncing" },
      { id: undefined, state: "paused" },
      { id: "b", state: null },
    ]);
    expect(result).toEqual(new Map([["a", "syncing"]]));
  });

  it("«paused» gana sobre «syncing» en cualquier orden", () => {
    expect(
      mergeSyncStates([
        { id: "a", state: "paused" },
        { id: "a", state: "syncing" },
        { id: "b", state: "syncing" },
        { id: "b", state: "paused" },
      ]),
    ).toEqual(
      new Map([
        ["a", "paused"],
        ["b", "paused"],
      ]),
    );
  });
});
