import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { generateCategory } from "./category-generator";

/*
 * La Server Action es un endpoint público: sin sesión no llama al modelo,
 * respeta el cupo de IA y nunca devuelve al cliente lo que el modelo
 * inventó fuera de las reglas.
 */

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/ai/client", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/ai/quota", () => ({ allowAiCall: vi.fn() }));

const getSession = vi.mocked(auth.api.getSession);
const model = vi.mocked(generateObject);
const quota = vi.mocked(allowAiCall);

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  quota.mockResolvedValue(true);
});

describe("generateCategory", () => {
  it("devuelve las opciones del modelo ya saneadas", async () => {
    model.mockResolvedValue({
      categories: [
        { icon: "🐶", color: "#1E3A8A" },
        { icon: "🐶", color: "#FDDCC4" },
        { icon: "🇵🇪", color: "#FDDCC4" },
        { icon: "🦴", color: "#FCE8B2" },
      ],
    });

    const result = await generateCategory("mascota");

    expect(result?.categories.map((c) => c.icon)).toEqual(["🐶", "🦴"]);
    expect(result?.categories[0].color).not.toBe("#1E3A8A");
  });

  it("recorta el nombre a 60 caracteres y lo delimita en el prompt", async () => {
    model.mockResolvedValue({ categories: [{ icon: "🍔", color: "#FDDCC4" }] });
    await generateCategory(`  ${"a".repeat(80)}  `);

    const { prompt, operation } = model.mock.calls[0][0];
    expect(operation).toBe("category.generate");
    expect(prompt).toContain(`<categoria>${"a".repeat(60)}</categoria>`);
    expect(prompt).not.toContain("a".repeat(61));
  });

  it("si ninguna opción del modelo es válida devuelve null (el formulario usa los de reserva)", async () => {
    model.mockResolvedValue({ categories: [{ icon: "comida", color: "rojo" }] });
    expect(await generateCategory("comida")).toBeNull();
  });

  it("con el cupo de IA agotado devuelve null sin llamar al modelo", async () => {
    quota.mockResolvedValue(false);
    expect(await generateCategory("comida")).toBeNull();
    expect(model).not.toHaveBeenCalled();
  });

  it("sin sesión o con el nombre vacío falla sin llamar al modelo", async () => {
    await expect(generateCategory("   ")).rejects.toThrow("Empty prompt");
    getSession.mockResolvedValue(null);
    await expect(generateCategory("comida")).rejects.toThrow("Unauthorized");
    expect(model).not.toHaveBeenCalled();
  });
});
