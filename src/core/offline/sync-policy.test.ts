import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { isNetworkError, isNotFound, mutationRetryDelay, shouldRetryMutation } from "./sync-policy";

function httpError(status: number) {
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
  } as AxiosResponse);
}

const networkError = new AxiosError("Network Error", "ERR_NETWORK");

describe("shouldRetryMutation", () => {
  it("sin respuesta (sin red) se reintenta siempre: la escritura no se pierde", () => {
    expect(isNetworkError(networkError)).toBe(true);
    expect(shouldRetryMutation(1, networkError)).toBe(true);
    expect(shouldRetryMutation(1_000, networkError)).toBe(true);
  });

  it("un 5xx se reintenta hasta 3 veces", () => {
    expect(shouldRetryMutation(0, httpError(503))).toBe(true);
    expect(shouldRetryMutation(2, httpError(500))).toBe(true);
    expect(shouldRetryMutation(3, httpError(500))).toBe(false);
  });

  it("un 4xx no se reintenta: el servidor rechazó el dato", () => {
    for (const status of [400, 401, 404, 409, 422]) {
      expect(shouldRetryMutation(0, httpError(status))).toBe(false);
    }
  });

  it("un error que no es de red ni HTTP no se reintenta", () => {
    expect(shouldRetryMutation(0, new TypeError("boom"))).toBe(false);
  });
});

describe("mutationRetryDelay", () => {
  it("crece exponencialmente con tope de 30 s", () => {
    expect([0, 1, 2, 3].map(mutationRetryDelay)).toEqual([1_000, 2_000, 4_000, 8_000]);
    expect(mutationRetryDelay(10)).toBe(30_000);
  });
});

describe("isNotFound", () => {
  it("sólo un 404 cuenta como 'ya no existe'", () => {
    expect(isNotFound(httpError(404))).toBe(true);
    expect(isNotFound(httpError(410))).toBe(false);
    expect(isNotFound(networkError)).toBe(false);
  });
});
