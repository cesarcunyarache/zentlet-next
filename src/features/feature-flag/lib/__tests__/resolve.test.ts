import { describe, expect, it } from "vitest";
import { enabledSlugs, isFlagOn, isValidRollout, rolloutBucket, usageCutoff } from "../resolve";

const flag = (slug: string, enabled: boolean, { rollout = 100, userEnabled = null as boolean | null } = {}) => ({
  slug,
  enabled,
  rollout,
  userEnabled,
});

const users = Array.from({ length: 10_000 }, (_, index) => `user-${index}`);
const share = (slug: string, rollout: number) =>
  users.filter((id) => isFlagOn(flag(slug, true, { rollout }), id)).length / users.length;

describe("isFlagOn", () => {
  it("apagado globalmente está apagado para todos, aunque el usuario lo tenga asignado", () => {
    expect(isFlagOn(flag("a", false), "u")).toBe(false);
    expect(isFlagOn(flag("a", false, { userEnabled: true }), "u")).toBe(false);
  });

  it("encendido, la asignación del usuario gana al porcentaje en ambos sentidos", () => {
    expect(isFlagOn(flag("a", true, { rollout: 0, userEnabled: true }), "u")).toBe(true);
    expect(isFlagOn(flag("a", true, { rollout: 100, userEnabled: false }), "u")).toBe(false);
  });

  it("0 % es nadie y 100 % es todos", () => {
    expect(share("a", 0)).toBe(0);
    expect(share("a", 100)).toBe(1);
  });

  it("el porcentaje reparte a los usuarios de forma aproximada", () => {
    expect(share("new-home", 5)).toBeCloseTo(0.05, 1);
    expect(share("new-home", 50)).toBeCloseTo(0.5, 1);
  });

  it("subir el porcentaje conserva a quienes ya lo tenían", () => {
    const at5 = users.filter((id) => isFlagOn(flag("new-home", true, { rollout: 5 }), id));
    const at20 = new Set(users.filter((id) => isFlagOn(flag("new-home", true, { rollout: 20 }), id)));
    expect(at5.every((id) => at20.has(id))).toBe(true);
  });

  it("cada flag elige a usuarios distintos", () => {
    const first = users.filter((id) => isFlagOn(flag("flag-a", true, { rollout: 10 }), id));
    const second = new Set(users.filter((id) => isFlagOn(flag("flag-b", true, { rollout: 10 }), id)));
    expect(first.filter((id) => second.has(id)).length / first.length).toBeLessThan(0.3);
  });
});

describe("rolloutBucket", () => {
  it("es estable y está entre 0 y 99", () => {
    expect(rolloutBucket("new-home", "user-1")).toBe(rolloutBucket("new-home", "user-1"));
    expect(users.every((id) => rolloutBucket("x", id) >= 0 && rolloutBucket("x", id) < 100)).toBe(true);
  });
});

describe("enabledSlugs", () => {
  it("devuelve sólo los flags activos para el usuario, ordenados", () => {
    expect(
      enabledSlugs(
        [
          flag("c", true),
          flag("a", true, { rollout: 0, userEnabled: true }),
          flag("b", true, { userEnabled: false }),
          flag("d", false),
        ],
        "u",
      ),
    ).toEqual(["a", "c"]);
  });
});

describe("isValidRollout", () => {
  it("acepta enteros de 0 a 100", () => {
    expect([0, 5, 100].every(isValidRollout)).toBe(true);
    expect([-1, 101, 2.5, Number.NaN].some(isValidRollout)).toBe(false);
  });
});

describe("usageCutoff", () => {
  it("es un día antes", () => {
    expect(usageCutoff(new Date("2026-09-30T12:00:00Z")).toISOString()).toBe("2026-09-29T12:00:00.000Z");
  });
});
