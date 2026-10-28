import { describe, expect, it } from "vitest";
import type { SenderRule } from "../../types";
import { normalizeAddress, normalizeSenderPattern, senderVerdict, shouldAutoBlock } from "../sender";

function rule(overrides: Partial<SenderRule>): SenderRule {
  return { address: "", status: "trusted", origin: "learned", acceptedCount: 0, dismissedCount: 0, ...overrides };
}

describe("normalizeAddress", () => {
  it("extracts the address from a display name", () => {
    expect(normalizeAddress('"BCP" <Notificaciones@NotificacionesBCP.com.pe>')).toBe(
      "notificaciones@notificacionesbcp.com.pe",
    );
  });
});

describe("normalizeSenderPattern", () => {
  it("turns a bare domain into a domain pattern", () => {
    expect(normalizeSenderPattern("Interbank.pe")).toBe("@interbank.pe");
    expect(normalizeSenderPattern("@bbva.pe")).toBe("@bbva.pe");
  });

  it("keeps full addresses", () => {
    expect(normalizeSenderPattern(" Alertas@Banco.pe ")).toBe("alertas@banco.pe");
  });

  it("rejects garbage", () => {
    expect(normalizeSenderPattern("hola")).toBe("");
  });
});

describe("senderVerdict", () => {
  it("knows BCP without any rule", () => {
    expect(senderVerdict("notificaciones@notificacionesbcp.com.pe", [])).toBe("known");
  });

  it("trusts an accepted learned address and a manual domain", () => {
    expect(senderVerdict("alertas@banco.pe", [rule({ address: "alertas@banco.pe", acceptedCount: 1 })])).toBe("trusted");
    expect(senderVerdict("avisos@mail.interbank.pe", [rule({ address: "@interbank.pe", origin: "manual" })])).toBe(
      "trusted",
    );
  });

  it("lets a block win even over a known bank", () => {
    const blocked = rule({ address: "notificaciones@notificacionesbcp.com.pe", status: "blocked" });
    expect(senderVerdict("notificaciones@notificacionesbcp.com.pe", [blocked])).toBe("blocked");
  });

  it("does not let a domain rule hijack a lookalike domain", () => {
    expect(senderVerdict("x@fakeinterbank.pe", [rule({ address: "@interbank.pe", origin: "manual" })])).toBe("unknown");
  });

  it("keeps a sender the user only dismissed as unknown", () => {
    expect(senderVerdict("promo@tienda.pe", [rule({ address: "promo@tienda.pe", dismissedCount: 1 })])).toBe("unknown");
  });
});

describe("shouldAutoBlock", () => {
  it("blocks an unknown sender after three dismissals and no accepts", () => {
    expect(shouldAutoBlock("promo@tienda.pe", rule({ dismissedCount: 3 }))).toBe(true);
  });

  it("never blocks known banks, manual senders or senders the user accepted before", () => {
    expect(shouldAutoBlock("n@notificacionesbcp.com.pe", rule({ dismissedCount: 9 }))).toBe(false);
    expect(shouldAutoBlock("a@banco.pe", rule({ origin: "manual", dismissedCount: 9 }))).toBe(false);
    expect(shouldAutoBlock("a@banco.pe", rule({ acceptedCount: 1, dismissedCount: 9 }))).toBe(false);
  });
});
