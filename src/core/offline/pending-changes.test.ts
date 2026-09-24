import { describe, expect, it } from "vitest";
import { applyPendingChanges, type PendingChange } from "./pending-changes";

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: "a", name: "Comida" },
  { id: "b", name: "Transporte" },
];

describe("applyPendingChanges", () => {
  it("una alta pendiente aparece primero", () => {
    const result = applyPendingChanges(rows, [{ kind: "create", row: { id: "c", name: "Salud" } }]);
    expect(result.map((row) => row.id)).toEqual(["c", "a", "b"]);
  });

  it("una alta que el servidor ya devolvió no se duplica", () => {
    const result = applyPendingChanges(rows, [{ kind: "create", row: { id: "a", name: "Comida" } }]);
    expect(result).toHaveLength(2);
  });

  it("aplica actualizaciones y borrados en orden", () => {
    const changes: PendingChange<Row>[] = [
      { kind: "create", row: { id: "c", name: "Salud" } },
      { kind: "update", id: "c", data: { name: "Salud y farmacia" } },
      { kind: "delete", id: "a" },
    ];
    expect(applyPendingChanges(rows, changes)).toEqual([
      { id: "c", name: "Salud y farmacia" },
      { id: "b", name: "Transporte" },
    ]);
  });

  it("sin cambios devuelve la lista tal cual", () => {
    expect(applyPendingChanges(rows, [])).toBe(rows);
  });
});
