import { describe, expect, it } from "vitest";
import { Prisma, type Category as CategoryRow } from "@/generated/prisma/client";
import { toDomain, toPersistence, toPersistenceChanges } from "../category.mapper";

const row = (aiSuggestions: unknown): CategoryRow => ({
  id: "cat-1",
  name: "Salud",
  icon: "💊",
  color: "#D5F0DD",
  description: null,
  aiSuggestions: aiSuggestions as CategoryRow["aiSuggestions"],
  userId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("category mapper", () => {
  it("lee las sugerencias guardadas", () => {
    expect(toDomain(row([{ icon: "💊", color: "#D5F0DD" }])).aiSuggestions).toEqual([{ icon: "💊", color: "#D5F0DD" }]);
  });

  it("un JSON guardado con otra forma se lee como sin sugerencias", () => {
    expect(toDomain(row({ categories: "x" })).aiSuggestions).toBeNull();
    expect(toDomain(row(null)).aiSuggestions).toBeNull();
  });

  it("sin sugerencias se guarda NULL de base de datos", () => {
    const data = toPersistence({ id: "cat-1", userId: "user-1", name: "Salud", icon: "💊", color: "#D5F0DD", description: null, aiSuggestions: null });
    expect(data.aiSuggestions).toBe(Prisma.DbNull);
  });

  it("un cambio sin aiSuggestions no toca la columna", () => {
    expect(toPersistenceChanges({ name: "Farmacia" })).toEqual({ name: "Farmacia" });
    expect(toPersistenceChanges({ aiSuggestions: null })).toEqual({ aiSuggestions: Prisma.DbNull });
  });
});
