import { describe, expect, it, vi } from "vitest";
import { DeleteCategoryUseCase } from "../delete-category.use-case";
import { fakeRepository } from "./fake-category.repository";

describe("DeleteCategoryUseCase", () => {
  it("borra la categoría del usuario", async () => {
    const repository = fakeRepository();
    expect(await new DeleteCategoryUseCase(repository).execute("user-1", "cat-1")).toEqual({ ok: true });
    expect(repository.deleteOwned).toHaveBeenCalledWith("user-1", "cat-1");
  });

  it("si no existe es not_found", async () => {
    const repository = fakeRepository({ deleteOwned: vi.fn().mockResolvedValue("not_found") });
    expect(await new DeleteCategoryUseCase(repository).execute("user-1", "cat-1")).toEqual({ error: "not_found" });
  });

  it("con movimientos es has_transactions", async () => {
    const repository = fakeRepository({ deleteOwned: vi.fn().mockResolvedValue("has_transactions") });
    expect(await new DeleteCategoryUseCase(repository).execute("user-1", "cat-1")).toEqual({ error: "has_transactions" });
  });
});
