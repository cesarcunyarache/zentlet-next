import { describe, expect, it } from "vitest";
import { chatUrl, formatLinkCode, generateLinkCode, hashLinkCode, LINK_CODE_LENGTH, linkCommandText } from "../link-code";

const bytes = (values: number[]) => () => Uint8Array.from(values);

describe("link code", () => {
  it("genera códigos sin caracteres ambiguos", () => {
    const code = generateLinkCode(bytes([0, 8, 14, 22, 23, 30, 31, 255]));
    expect(code).toHaveLength(LINK_CODE_LENGTH);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]+$/);
  });

  it("el hash no cambia con el formato que escriba el usuario", () => {
    expect(hashLinkCode("k7p2-9qxm")).toBe(hashLinkCode("K7P29QXM"));
    expect(hashLinkCode("K7P29QXM")).not.toBe(hashLinkCode("K7P29QXN"));
  });

  it("arma el enlace de WhatsApp con el comando ya escrito", () => {
    expect(formatLinkCode("K7P29QXM")).toBe("K7P2-9QXM");
    expect(chatUrl("+51 999 888 777", linkCommandText("K7P29QXM"))).toBe(
      "https://wa.me/51999888777?text=vincular%20K7P2-9QXM",
    );
  });
});
