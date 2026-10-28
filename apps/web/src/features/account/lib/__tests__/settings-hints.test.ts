import { describe, expect, it } from "vitest";
import {
  connectionHint,
  exportFileName,
  exportHint,
  needsSignOutConfirmation,
  signOutHint,
} from "../settings-hints";

describe("connectionHint", () => {
  it("con conexión y sin nada enviándose está sincronizado", () => {
    expect(connectionHint({ isOnline: true, pendingCount: 3, syncingCount: 0 })).toEqual({ key: "synced" });
  });

  it("con conexión muestra cuántos cambios se están enviando", () => {
    expect(connectionHint({ isOnline: true, pendingCount: 0, syncingCount: 2 })).toEqual({
      key: "syncing",
      values: { count: 2 },
    });
  });

  it("sin conexión muestra cuántos cambios quedan pendientes", () => {
    expect(connectionHint({ isOnline: false, pendingCount: 4, syncingCount: 1 })).toEqual({
      key: "pending",
      values: { count: 4 },
    });
  });

  it("sin conexión y sin pendientes lo indica", () => {
    expect(connectionHint({ isOnline: false, pendingCount: 0, syncingCount: 5 })).toEqual({ key: "noPending" });
  });
});

describe("exportHint", () => {
  it("sin conexión no se puede exportar, aunque haya fallado antes", () => {
    expect(exportHint({ isOnline: false, hasFailed: true, transactionCount: 9 })).toEqual({ key: "exportOffline" });
  });

  it("con conexión muestra el fallo", () => {
    expect(exportHint({ isOnline: true, hasFailed: true, transactionCount: 9 })).toEqual({ key: "exportFailed" });
  });

  it("por defecto muestra cuántos movimientos hay", () => {
    expect(exportHint({ isOnline: true, hasFailed: false, transactionCount: 9 })).toEqual({
      key: "count",
      values: { count: 9 },
    });
  });
});

describe("signOutHint", () => {
  it("sin conexión avisa que no se puede cerrar sesión", () => {
    expect(signOutHint({ isOnline: false, isConfirming: true, pendingCount: 2 })).toEqual({ key: "offline" });
  });

  it("al confirmar muestra cuántos cambios se perderían", () => {
    expect(signOutHint({ isOnline: true, isConfirming: true, pendingCount: 2 })).toEqual({
      key: "confirm",
      values: { count: 2 },
    });
  });

  it("por defecto muestra la pista normal", () => {
    expect(signOutHint({ isOnline: true, isConfirming: false, pendingCount: 2 })).toEqual({ key: "hint" });
  });
});

describe("needsSignOutConfirmation", () => {
  it.each([
    [0, false, false],
    [0, true, false],
    [3, false, true],
    [3, true, false],
  ])("con %i pendientes y confirmando=%s → %s", (pendingCount, isConfirming, expected) => {
    expect(needsSignOutConfirmation(pendingCount, isConfirming)).toBe(expected);
  });
});

describe("exportFileName", () => {
  it("usa la fecha local del día", () => {
    expect(exportFileName(new Date(2026, 0, 5, 23, 59))).toBe("zentlet-2026-01-05.xlsx");
  });
});
