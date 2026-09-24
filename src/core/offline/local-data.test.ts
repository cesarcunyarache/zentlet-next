import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elapsedSincePageFirstSeen } from "./local-data";

const DAY = 24 * 60 * 60 * 1000;

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    snapshot: (key: string) => JSON.parse(data.get(key) ?? "{}") as Record<string, number>,
  };
}

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-24T12:00:00Z"));
  storage = memoryStorage();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("elapsedSincePageFirstSeen", () => {
  it("una página recién generada cuenta desde cero, aunque el reloj del servidor sea otro", () => {
    // el servidor va 30 días por detrás del dispositivo: da igual
    const renderedAt = Date.now() - 30 * DAY;
    expect(elapsedSincePageFirstSeen(renderedAt)).toBe(0);
  });

  it("la misma página abierta más tarde mide el tiempo real transcurrido en el dispositivo", () => {
    const renderedAt = 1_000;
    elapsedSincePageFirstSeen(renderedAt);
    vi.advanceTimersByTime(8 * DAY);
    expect(elapsedSincePageFirstSeen(renderedAt)).toBe(8 * DAY);
  });

  it("una página nueva (otra generación) vuelve a empezar", () => {
    elapsedSincePageFirstSeen(1_000);
    vi.advanceTimersByTime(8 * DAY);
    expect(elapsedSincePageFirstSeen(2_000)).toBe(0);
  });

  it("sólo recuerda las 5 páginas más recientes", () => {
    for (const renderedAt of [1, 2, 3, 4, 5, 6, 7]) elapsedSincePageFirstSeen(renderedAt);
    expect(Object.keys(storage.snapshot("zentlet-seen-pages")).map(Number).sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it("sin almacenamiento disponible no caduca (no puede medirlo) y no lanza", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(elapsedSincePageFirstSeen(1_000)).toBe(0);
  });
});
