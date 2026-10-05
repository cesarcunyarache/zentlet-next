import { describe, expect, it } from "vitest";
import { donutArcs } from "../donut";

describe("donutArcs", () => {
  it("cada porción empieza donde terminó la anterior", () => {
    const arcs = donutArcs(
      [
        { key: "a", share: 0.5 },
        { key: "b", share: 0.3 },
        { key: "c", share: 0.2 },
      ],
      100,
    );

    expect(arcs.map(({ key, length, offset }) => ({ key, length, offset }))).toEqual([
      { key: "a", length: 50, offset: 0 },
      { key: "b", length: 30, offset: 50 },
      { key: "c", length: 20, offset: 80 },
    ]);
  });
});
