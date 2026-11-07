import { describe, expect, it } from "vitest";
import { mergeExtras } from "../merge-extras";

describe("mergeExtras", () => {
  it("añade el cambio sin borrar lo que ya estaba guardado", () => {
    expect(mergeExtras({ hideBalance: true }, { feedPeriod: "month" })).toEqual({ hideBalance: true, feedPeriod: "month" });
  });

  it("el cambio pisa el valor anterior de su misma clave", () => {
    expect(mergeExtras({ feedPeriod: "all" }, { feedPeriod: "month" })).toEqual({ feedPeriod: "month" });
  });

  it("conserva claves desconocidas ya guardadas", () => {
    expect(mergeExtras({ legacy: 1 }, { hideBalance: false })).toEqual({ legacy: 1, hideBalance: false });
  });

  it.each([null, undefined, "x", 3, []])("parte de vacío si lo guardado es %j", (stored) => {
    expect(mergeExtras(stored, { hideBalance: true })).toEqual({ hideBalance: true });
  });
});
