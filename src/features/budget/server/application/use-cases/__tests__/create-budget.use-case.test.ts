import { describe, expect, it, vi } from "vitest";
import type { CreateBudgetInput } from "../../../../schemas/budget-api.schema";
import type { ListPlacement } from "../../../domain/ports/budget.ports";
import { CreateBudgetUseCase } from "../create-budget.use-case";
import { budget, fakeRepository } from "./fake-budget.repository";

const USER = "user-1";

const input: CreateBudgetInput = {
  id: "b1",
  categoryId: "food",
  listId: "list-1",
  kind: "recurring",
  periodUnit: "month",
  periodCount: 1,
  startDate: "2026-09-01",
  amount: 600,
};

const openList = (accepts = true): ListPlacement => ({ accepts: vi.fn().mockResolvedValue(accepts) });

describe("CreateBudgetUseCase", () => {
  it("crea el presupuesto con su primer tope y las alertas por defecto", async () => {
    const repository = fakeRepository();
    const result = await new CreateBudgetUseCase(repository, openList()).execute(USER, input);

    expect(result).toMatchObject({ created: true, budget: { id: "b1", userId: USER } });
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date("2026-09-01"),
        initialLimit: 600,
        alerts: [{ kind: "percent", value: 80 }],
      }),
    );
  });

  it("reenviar el mismo id devuelve el existente", async () => {
    const repository = fakeRepository({ findById: vi.fn().mockResolvedValue(budget) });

    expect(await new CreateBudgetUseCase(repository, openList()).execute(USER, input)).toEqual({
      budget,
      created: false,
    });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("un id de otro usuario es id_taken", async () => {
    const repository = fakeRepository({ findById: vi.fn().mockResolvedValue({ ...budget, userId: "user-2" }) });

    expect(await new CreateBudgetUseCase(repository, openList()).execute(USER, input)).toEqual({ error: "id_taken" });
  });

  it("una categoría ajena es category_not_found", async () => {
    const repository = fakeRepository({ categoryBelongsTo: vi.fn().mockResolvedValue(false) });

    expect(await new CreateBudgetUseCase(repository, openList()).execute(USER, input)).toEqual({
      error: "category_not_found",
    });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("una lista donde no puede aportar es list_not_found", async () => {
    const repository = fakeRepository();

    expect(await new CreateBudgetUseCase(repository, openList(false)).execute(USER, input)).toEqual({
      error: "list_not_found",
    });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("si otra petición gana la carrera devuelve la ganadora", async () => {
    const repository = fakeRepository({
      insert: vi.fn().mockResolvedValue("already_exists"),
      findOwned: vi.fn().mockResolvedValue(budget),
    });

    expect(await new CreateBudgetUseCase(repository, openList()).execute(USER, input)).toEqual({
      budget,
      created: false,
    });
  });

  it("si la categoría ya tiene presupuesto en la lista es category_has_budget", async () => {
    const repository = fakeRepository({ insert: vi.fn().mockResolvedValue("already_exists") });

    expect(await new CreateBudgetUseCase(repository, openList()).execute(USER, input)).toEqual({
      error: "category_has_budget",
    });
  });
});
