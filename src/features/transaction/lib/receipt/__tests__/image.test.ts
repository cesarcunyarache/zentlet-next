import { describe, expect, it } from "vitest";
import { fitWithin } from "../image";

describe("fitWithin", () => {
  it("keeps small images untouched", () => {
    expect(fitWithin({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });

  it("scales a tall phone screenshot down by its longest side", () => {
    expect(fitWithin({ width: 1170, height: 2532 })).toEqual({ width: 739, height: 1600 });
  });

  it("scales a wide photo down by its longest side", () => {
    expect(fitWithin({ width: 4032, height: 3024 })).toEqual({ width: 1600, height: 1200 });
  });
});
