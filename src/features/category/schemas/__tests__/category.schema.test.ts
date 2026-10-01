import { describe, expect, it } from "vitest";
import { createCategorySchema } from "./category-api.schema";
import { categorySchema } from "./category.schema";

const valid = { name: "Comida", icon: "🍔", color: "#FDDCC4" };

describe("categorySchema", () => {
  it("acepta una categoría válida", () => {
    expect(categorySchema.safeParse(valid).success).toBe(true);
  });

  it("exige un nombre de al menos 2 caracteres sin contar espacios", () => {
    expect(categorySchema.safeParse({ ...valid, name: "a" }).success).toBe(false);
    expect(categorySchema.safeParse({ ...valid, name: "  a  " }).success).toBe(false);
  });

  it("rechaza un nombre de 61 caracteres, igual que la API", () => {
    const name = "a".repeat(61);
    expect(categorySchema.safeParse({ ...valid, name }).success).toBe(false);
    expect(createCategorySchema.safeParse({ ...valid, id: crypto.randomUUID(), name }).success).toBe(false);
  });

  it("acepta un nombre de 60 caracteres", () => {
    expect(categorySchema.safeParse({ ...valid, name: "a".repeat(60) }).success).toBe(true);
  });

  it("recorta el nombre como la API", () => {
    expect(categorySchema.parse({ ...valid, name: "  Comida  " }).name).toBe("Comida");
  });

  it("exige icono y color dentro de los límites de la API", () => {
    expect(categorySchema.safeParse({ ...valid, icon: "" }).success).toBe(false);
    expect(categorySchema.safeParse({ ...valid, icon: "x".repeat(17) }).success).toBe(false);
    expect(categorySchema.safeParse({ ...valid, color: "" }).success).toBe(false);
    expect(categorySchema.safeParse({ ...valid, color: "x".repeat(33) }).success).toBe(false);
  });
});
