import { describe, expect, it } from "vitest";
import type { Messages } from "next-intl";
import { clientMessages } from "../client-messages";

const messages = {
  common: { save: "Guardar" },
  landing: { hero: "Tus gastos" },
  budgets: { sheet: { title: "Presupuesto" } },
} as unknown as Messages;

describe("clientMessages", () => {
  it("envía al navegador todos los módulos, también los que se añadan después", () => {
    expect(clientMessages(messages)).toMatchObject({ common: messages.common, budgets: messages.budgets });
  });

  it("la landing no viaja al cliente", () => {
    expect(clientMessages(messages)).not.toHaveProperty("landing");
  });
});
