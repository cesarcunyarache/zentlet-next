import { describe, expect, it } from "vitest";
import { afterCursor, feedWhere, summaryWhere } from "./feed-query";

describe("summaryWhere", () => {
  it("sin rango no filtra por fecha", () => {
    expect(summaryWhere("u1", {})).toEqual({ userId: "u1", transactionDate: undefined });
  });

  it("aplica sólo los límites presentes", () => {
    expect(summaryWhere("u1", { from: "2026-09-01" })).toEqual({
      userId: "u1",
      transactionDate: { gte: new Date("2026-09-01") },
    });
    expect(summaryWhere("u1", { from: "2026-09-01", to: "2026-10-01" })).toEqual({
      userId: "u1",
      transactionDate: { gte: new Date("2026-09-01"), lt: new Date("2026-10-01") },
    });
  });
});

describe("feedWhere", () => {
  it("sin filtros es el del resumen", () => {
    expect(feedWhere("u1", {})).toEqual({ userId: "u1", transactionDate: undefined });
  });

  it("añade tipo, categoría y búsqueda en descripción o nombre de categoría", () => {
    expect(feedWhere("u1", { to: "2026-10-01", type: "income", categoryId: "c1", q: "taxi" })).toEqual({
      userId: "u1",
      transactionDate: { lt: new Date("2026-10-01") },
      type: "income",
      categoryId: "c1",
      OR: [
        { description: { contains: "taxi", mode: "insensitive" } },
        { category: { name: { contains: "taxi", mode: "insensitive" } } },
      ],
    });
  });

  it("ignora filtros vacíos", () => {
    expect(feedWhere("u1", { q: "", categoryId: "" })).toEqual({ userId: "u1", transactionDate: undefined });
  });
});

describe("afterCursor", () => {
  it("filas estrictamente posteriores por fecha, alta e id", () => {
    const day = new Date("2026-09-10");
    const created = new Date("2026-09-10T15:30:12.345Z");
    expect(afterCursor({ date: "2026-09-10", createdAt: "2026-09-10T15:30:12.345Z", id: "b" })).toEqual({
      transactionDate: { lte: day },
      OR: [
        { transactionDate: { lt: day } },
        { transactionDate: day, createdAt: { lt: created } },
        { transactionDate: day, createdAt: created, id: { lt: "b" } },
      ],
    });
  });
});
