import { describe, expect, it, vi } from "vitest";
import { UpdateCategoryUseCase } from "../update-category.use-case";
import { fakeRepository, stored } from "./fake-category.repository";

const USER = "user-1";
const ID = "cat-1";

const category = stored({ id: ID, userId: USER, name: "Mascota", icon: "🐶", color: "#CFE3F7", description: null, aiSuggestions: null });

describe("UpdateCategoryUseCase", () => {
  it("sin aiSuggestions no las toca", async () => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(category) });
    await new UpdateCategoryUseCase(repository).execute(USER, ID, { name: "Mascota" });

    expect(repository.updateOwned).toHaveBeenCalledWith(USER, ID, { name: "Mascota" });
  });

  it("con aiSuggestions las reemplaza saneadas", async () => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(category) });
    await new UpdateCategoryUseCase(repository).execute(USER, ID, {
      aiSuggestions: [{ icon: "🐶", color: "#CFE3F7" }, { icon: "🐶", color: "#FDDCC4" }],
    });

    expect(repository.updateOwned).toHaveBeenCalledWith(USER, ID, { aiSuggestions: [{ icon: "🐶", color: "#CFE3F7" }] });
  });

  it("con aiSuggestions null las borra", async () => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(category) });
    await new UpdateCategoryUseCase(repository).execute(USER, ID, { aiSuggestions: null });

    expect(repository.updateOwned).toHaveBeenCalledWith(USER, ID, { aiSuggestions: null });
  });

  it("si no existe o es ajena es not_found", async () => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue("not_found") });

    expect(await new UpdateCategoryUseCase(repository).execute(USER, ID, { name: "x" })).toEqual({ error: "not_found" });
  });
});
