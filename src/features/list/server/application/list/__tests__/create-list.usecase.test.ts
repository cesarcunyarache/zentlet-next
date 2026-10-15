import { describe, expect, it, vi } from "vitest";
import { CreateListUseCase } from "../create-list.usecase";
import { LIST_ID, OWNER, fakeCurrency, fakeLists, storedList } from "../../__tests__/fakes";

const input = { id: LIST_ID, name: "Viaje a Cusco", icon: "🏔️", color: "#D6E8F7" };

describe("CreateListUseCase", () => {
  it("crea la lista con la moneda de la cuenta y el creador como dueño", async () => {
    const lists = fakeLists({ findById: vi.fn().mockResolvedValue(null) });

    const result = await new CreateListUseCase(lists, fakeCurrency("USD")).execute(OWNER, input);

    expect(lists.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: LIST_ID, ownerId: OWNER, currency: "USD", description: null }),
    );
    expect(result).toMatchObject({ created: true, list: { role: "owner", memberCount: 1, count: 0 } });
  });

  it("reenviar el mismo id devuelve la lista existente", async () => {
    const lists = fakeLists();

    const result = await new CreateListUseCase(lists, fakeCurrency()).execute(OWNER, input);

    expect(lists.insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ created: false, list: { id: storedList.id } });
  });

  it("un id de otro usuario es un conflicto", async () => {
    const result = await new CreateListUseCase(fakeLists(), fakeCurrency()).execute("intruder", input);

    expect(result).toEqual({ error: "id_taken" });
  });
});
