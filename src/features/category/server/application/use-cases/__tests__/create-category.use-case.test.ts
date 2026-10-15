import { describe, expect, it, vi } from "vitest";
import type { CreateCategoryInput } from "../../../../schemas/category-api.schema";
import { MAX_CATEGORIES } from "../../../domain/entities/category.entity";
import { CreateCategoryUseCase } from "../create-category.use-case";
import { fakeRepository, stored } from "./fake-category.repository";

const USER = "user-1";

const input: CreateCategoryInput = {
  id: "0b9c4d2e-3f4a-4b5c-8d6e-7f8091a2b3c4",
  name: "Salud",
  icon: "💊",
  color: "#D5F0DD",
};

const existing = (userId: string) =>
  stored({ ...input, userId, description: null, aiSuggestions: null });

describe("CreateCategoryUseCase", () => {
  it("crea la categoría del usuario con descripción y sugerencias nulas por defecto", async () => {
    const repository = fakeRepository();
    const result = await new CreateCategoryUseCase(repository).execute(
      USER,
      input,
    );

    expect(result).toMatchObject({
      created: true,
      category: { id: input.id, userId: USER },
    });
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ description: null, aiSuggestions: null }),
    );
  });

  it("guarda las sugerencias saneadas", async () => {
    const repository = fakeRepository();
    await new CreateCategoryUseCase(repository).execute(USER, {
      ...input,
      aiSuggestions: [
        { icon: "💊", color: "#D5F0DD" },
        { icon: "💊", color: "#CFE3F7" },
        { icon: "texto", color: "#CFE3F7" },
      ],
    });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        aiSuggestions: [{ icon: "💊", color: "#D5F0DD" }],
      }),
    );
  });

  it("reenviar el mismo id devuelve la existente aunque se haya alcanzado el tope", async () => {
    const own = existing(USER);
    const repository = fakeRepository({
      findById: vi.fn().mockResolvedValue(own),
      countOwned: vi.fn().mockResolvedValue(MAX_CATEGORIES),
    });

    expect(
      await new CreateCategoryUseCase(repository).execute(USER, input),
    ).toEqual({ category: own, created: false });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("un id de otro usuario es id_taken", async () => {
    const repository = fakeRepository({
      findById: vi.fn().mockResolvedValue(existing("user-2")),
    });

    expect(
      await new CreateCategoryUseCase(repository).execute(USER, input),
    ).toEqual({ error: "id_taken" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("con el tope alcanzado es limit_reached", async () => {
    const repository = fakeRepository({
      countOwned: vi.fn().mockResolvedValue(MAX_CATEGORIES),
    });

    expect(
      await new CreateCategoryUseCase(repository).execute(USER, input),
    ).toEqual({ error: "limit_reached" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("si otra petición gana la carrera devuelve la ganadora", async () => {
    const winner = existing(USER);
    const repository = fakeRepository({
      insert: vi.fn().mockResolvedValue("id_taken"),
      findOwned: vi.fn().mockResolvedValue(winner),
    });

    expect(
      await new CreateCategoryUseCase(repository).execute(USER, input),
    ).toEqual({ category: winner, created: false });
  });

  it("si la carrera la ganó otro usuario es id_taken", async () => {
    const repository = fakeRepository({
      insert: vi.fn().mockResolvedValue("id_taken"),
    });

    expect(
      await new CreateCategoryUseCase(repository).execute(USER, input),
    ).toEqual({ error: "id_taken" });
  });
});
