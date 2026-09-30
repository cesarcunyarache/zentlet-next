import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { generateObject } from "@/lib/ai/client";
import { allowAiCall } from "@/lib/ai/quota";
import { suggestTransactionCategory } from "./category-suggester";

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/ai/client", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/ai/quota", () => ({ allowAiCall: vi.fn() }));

const model = vi.mocked(generateObject);
const categories = [
  { id: "c-food", name: "Comida" },
  { id: "c-car", name: "Auto" },
];
const suggest = (input: unknown) => suggestTransactionCategory(input as Parameters<typeof suggestTransactionCategory>[0]);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(allowAiCall).mockResolvedValue(true);
});

describe("suggestTransactionCategory", () => {
  it("devuelve la categoría del modelo si es una de las enviadas", async () => {
    model.mockResolvedValue({ categoryId: "c-car", type: "expense" });

    expect(await suggest({ description: "gasolina", categories })).toEqual({ categoryId: "c-car", type: "expense" });
  });

  it("descarta un id que el modelo inventó", async () => {
    model.mockResolvedValue({ categoryId: "c-otra", type: "expense" });

    expect(await suggest({ description: "gasolina", categories })).toEqual({ categoryId: null, type: "expense" });
  });

  it("rechaza sin llamar al modelo una entrada que infla el prompt o no tiene la forma esperada", async () => {
    const inputs = [
      { description: "gasolina", categories: [{ id: "x".repeat(65), name: "Auto" }] },
      { description: "gasolina", categories: [{ id: "c-car", name: "x".repeat(61) }] },
      { description: "gasolina", categories: Array.from({ length: 201 }, (_, i) => ({ id: `c-${i}`, name: "A" })) },
      { description: 42, categories },
      { description: "gasolina", categories: "c-car" },
      null,
    ];

    for (const input of inputs) expect(await suggest(input)).toBeNull();
    expect(model).not.toHaveBeenCalled();
  });

  it("sólo envía al modelo las primeras 60 categorías", async () => {
    model.mockResolvedValue({ categoryId: null, type: "expense" });
    const many = Array.from({ length: 100 }, (_, i) => ({ id: `c-${i}`, name: `Cat ${i}` }));

    await suggest({ description: "gasolina", categories: many });

    const { prompt } = model.mock.calls[0][0];
    expect(prompt).toContain("c-59: Cat 59");
    expect(prompt).not.toContain("c-60: Cat 60");
  });
});
