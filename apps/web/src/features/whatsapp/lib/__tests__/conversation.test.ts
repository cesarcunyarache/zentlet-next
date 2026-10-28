import { describe, expect, it } from "vitest";
import {
  categoryChoiceId,
  emptyConversation,
  emptyMovement,
  mergeMovement,
  missingField,
  parseChoice,
  quickAnswer,
  sanitizeMovement,
  splitReady,
  toReadyMovement,
  undoChoiceId,
  withTurn,
} from "../conversation";
import { movementId } from "../movement-id";

const categories = [
  { id: "food", name: "Comida" },
  { id: "transport", name: "Transporte" },
];

describe("sanitizeMovement", () => {
  it("descarta montos, categorías y fechas inválidas", () => {
    expect(
      sanitizeMovement({ type: "expense", amount: -3, categoryId: "inventada", description: "  ", date: "2026-02-31" }, categories),
    ).toEqual({ ...emptyMovement(), type: "expense" });
  });

  it("redondea a céntimos y conserva lo válido", () => {
    expect(
      sanitizeMovement({ type: "income", amount: 10.456, categoryId: "food", description: " Venta ", date: "2026-10-14" }, categories),
    ).toEqual({ type: "income", amount: 10.46, categoryId: "food", description: "Venta", date: "2026-10-14" });
  });
});

describe("borradores", () => {
  const draft = { ...emptyMovement(), description: "Taxi" };

  it("pide primero el monto y luego la categoría", () => {
    expect(missingField(draft)).toBe("amount");
    expect(missingField({ ...draft, amount: 18 })).toBe("category");
    expect(missingField({ ...draft, amount: 18, categoryId: "transport" })).toBeNull();
  });

  it("la respuesta completa el borrador sin perder la descripción original", () => {
    expect(mergeMovement(draft, { ...emptyMovement(), amount: 18, description: "otra" })).toMatchObject({
      amount: 18,
      description: "Taxi",
    });
  });

  it("separa los completos de los pendientes", () => {
    const ready = { ...draft, amount: 18, categoryId: "transport" };
    expect(splitReady([draft, ready])).toEqual({ ready: [ready], pending: [draft] });
  });

  it("completa tipo, fecha y descripción por defecto", () => {
    expect(toReadyMovement({ ...emptyMovement(), amount: 5, categoryId: "food" }, "2026-10-15", categories)).toEqual({
      type: "expense",
      amount: 5,
      categoryId: "food",
      description: "Comida",
      date: "2026-10-15",
    });
  });
});

describe("quickAnswer", () => {
  it("entiende un monto suelto cuando falta el monto", () => {
    expect(quickAnswer("18", "amount", categories, "es")).toMatchObject({ amount: 18 });
    expect(quickAnswer("s/ 18.50", "amount", categories, "es")).toMatchObject({ amount: 18.5 });
    expect(quickAnswer("fue el martes con mi primo, como 18", "amount", categories, "es")).toBeNull();
  });

  it("entiende el nombre de la categoría cuando falta la categoría", () => {
    expect(quickAnswer("comida", "category", categories, "es")).toMatchObject({ categoryId: "food" });
    expect(quickAnswer("ponlo en lo que creas mejor por favor", "category", categories, "es")).toBeNull();
  });
});

describe("choices", () => {
  it("ida y vuelta de los ids de botones", () => {
    expect(parseChoice(categoryChoiceId("food"))).toEqual({ kind: "category", categoryId: "food" });
    expect(parseChoice(undoChoiceId(["a", "b"]))).toEqual({ kind: "undo", ids: ["a", "b"] });
    expect(parseChoice("cancel")).toEqual({ kind: "cancel" });
    expect(parseChoice("undo:")).toBeNull();
    expect(parseChoice("otra-cosa")).toBeNull();
  });
});

describe("withTurn", () => {
  it("guarda solo los últimos mensajes", () => {
    let conversation = emptyConversation();
    for (let index = 0; index < 10; index++) conversation = withTurn(conversation, "user", `m${index}`);
    expect(conversation.history.map((turn) => turn.text)).toEqual(["m4", "m5", "m6", "m7", "m8", "m9"]);
  });
});

describe("movementId", () => {
  it("es un uuid estable por mensaje y posición", () => {
    expect(movementId("wamid.1", 0)).toBe(movementId("wamid.1", 0));
    expect(movementId("wamid.1", 0)).not.toBe(movementId("wamid.1", 1));
    expect(movementId("wamid.1", 0)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
