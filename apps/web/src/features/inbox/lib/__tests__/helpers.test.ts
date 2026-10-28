import { describe, expect, it } from "vitest";
import { generateLocalPart, inboxAddress } from "../address";
import { readGmailVerification } from "../gmail";
import { merchantKey } from "../merchant";
import { isDkimVerified } from "../verification";

describe("merchantKey", () => {
  it("drops branch codes and numbers so the same merchant matches across branches", () => {
    expect(merchantKey("IKF A53 PIURA 21")).toBe("ikf piura");
    expect(merchantKey("Ikf A53 Piura 21")).toBe("ikf piura");
  });

  it("returns null when nothing meaningful is left", () => {
    expect(merchantKey("123 45")).toBeNull();
    expect(merchantKey(null)).toBeNull();
  });
});

describe("readGmailVerification", () => {
  it("extracts the code and confirmation link", () => {
    const result = readGmailVerification(
      { from: "Gmail Team <forwarding-noreply@google.com>", subject: "(#123456789) Confirmación de reenvío de Gmail" },
      "Para confirmar haz clic en https://mail-settings.google.com/mail/vf-abc123-XYZ.\nCódigo: 123456789",
    );
    expect(result).toEqual({ code: "123456789", url: "https://mail-settings.google.com/mail/vf-abc123-XYZ" });
  });

  it("ignores other senders", () => {
    expect(readGmailVerification({ from: "x@bank.pe", subject: "(#123456)" }, "")).toBeNull();
  });
});

describe("isDkimVerified", () => {
  const address = "notificaciones@notificacionesbcp.com.pe";

  it("accepts a DKIM pass for the sender domain, including ARC results from forwarding", () => {
    const headers = [
      { name: "ARC-Authentication-Results", value: "i=1; mx.google.com; dkim=pass header.i=@notificacionesbcp.com.pe" },
    ];
    expect(isDkimVerified(headers, address)).toBe(true);
  });

  it("rejects a pass for another domain", () => {
    const headers = [{ name: "Authentication-Results", value: "dkim=pass header.d=evil.com" }];
    expect(isDkimVerified(headers, address)).toBe(false);
  });
});

describe("generateLocalPart", () => {
  it("builds a 12 character unambiguous token", () => {
    const local = generateLocalPart((size) => new Uint8Array(size).map((_, index) => index * 37));
    expect(local).toMatch(/^[a-km-np-z2-9]{12}$/);
    expect(inboxAddress(local, "In.Zentlet.App")).toBe(`${local}@in.zentlet.app`);
  });
});
