import { describe, expect, it } from "vitest";
import { parseCommand } from "../commands";

describe("parseCommand", () => {
  it("reconoce el código de vinculación con o sin guion y en cualquier caso", () => {
    expect(parseCommand("vincular K7P2-9QXM")).toEqual({ kind: "link", code: "k7p2-9qxm" });
    expect(parseCommand("  Link k7p29qxm ")).toEqual({ kind: "link", code: "k7p29qxm" });
  });

  it("reconoce los comandos sueltos en español e inglés, sin tildes ni signos", () => {
    expect(parseCommand("Desvincular")).toEqual({ kind: "unlink" });
    expect(parseCommand("¡Cancelar!")).toEqual({ kind: "cancel" });
    expect(parseCommand("undo")).toEqual({ kind: "undo" });
    expect(parseCommand("ayuda")).toEqual({ kind: "help" });
  });

  it("un mensaje normal no es un comando aunque contenga la palabra", () => {
    expect(parseCommand("cancelar la suscripción de netflix 45")).toBeNull();
    expect(parseCommand("almuerzo 25")).toBeNull();
    expect(parseCommand("vincular")).toBeNull();
  });
});
