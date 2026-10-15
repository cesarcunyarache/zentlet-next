import { describe, expect, it, vi } from "vitest";
import { AssignEntriesUseCase } from "../assign-entries.usecase";
import { ListEntriesUseCase } from "../list-entries.usecase";
import { RemoveEntryUseCase } from "../remove-entry.usecase";
import { LIST_ID, OWNER, fakeCurrency, fakeLists, fakeMembers, membersWithRoles } from "../../__tests__/fakes";

const TX_A = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const TX_B = "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e";

describe("AssignEntriesUseCase", () => {
  it("agrega los movimientos propios, sin duplicar ids", async () => {
    const lists = fakeLists();

    const result = await new AssignEntriesUseCase(lists, fakeMembers(), fakeCurrency()).execute(OWNER, LIST_ID, {
      transactionIds: [TX_A, TX_B, TX_A],
    });

    expect(lists.assign).toHaveBeenCalledWith(LIST_ID, OWNER, [TX_A, TX_B]);
    expect(result).toEqual({ assigned: 2 });
  });

  it("rechaza movimientos ajenos o inexistentes sin tocar ninguno", async () => {
    const lists = fakeLists({ countOwnedTransactions: vi.fn().mockResolvedValue(1) });

    const result = await new AssignEntriesUseCase(lists, fakeMembers(), fakeCurrency()).execute(OWNER, LIST_ID, {
      transactionIds: [TX_A, TX_B],
    });

    expect(result).toEqual({ error: "transaction_not_found" });
    expect(lists.assign).not.toHaveBeenCalled();
  });

  it("rechaza si la moneda de la cuenta no es la de la lista", async () => {
    const lists = fakeLists();

    const result = await new AssignEntriesUseCase(lists, fakeMembers(), fakeCurrency("USD")).execute(OWNER, LIST_ID, {
      transactionIds: [TX_A],
    });

    expect(result).toEqual({ error: "currency_mismatch" });
    expect(lists.assign).not.toHaveBeenCalled();
  });

  it("un lector no puede agregar", async () => {
    const result = await new AssignEntriesUseCase(fakeLists(), membersWithRoles({ v: "viewer" }), fakeCurrency()).execute(
      "v",
      LIST_ID,
      { transactionIds: [TX_A] },
    );

    expect(result).toEqual({ error: "forbidden" });
  });
});

describe("RemoveEntryUseCase", () => {
  it("el autor siempre puede sacar su movimiento", async () => {
    const lists = fakeLists({ findEntryAuthor: vi.fn().mockResolvedValue("v") });

    expect(await new RemoveEntryUseCase(lists, membersWithRoles({ v: "viewer" })).execute("v", LIST_ID, TX_A)).toEqual({
      ok: true,
    });
    expect(lists.unassign).toHaveBeenCalledWith(LIST_ID, TX_A);
  });

  it("un editor no saca movimientos de otros", async () => {
    const lists = fakeLists({ findEntryAuthor: vi.fn().mockResolvedValue("someone-else") });

    expect(await new RemoveEntryUseCase(lists, membersWithRoles({ ed: "editor" })).execute("ed", LIST_ID, TX_A)).toEqual({
      error: "forbidden",
    });
    expect(lists.unassign).not.toHaveBeenCalled();
  });

  it("el dueño saca cualquiera", async () => {
    const lists = fakeLists({ findEntryAuthor: vi.fn().mockResolvedValue("someone-else") });

    expect(await new RemoveEntryUseCase(lists, fakeMembers()).execute(OWNER, LIST_ID, TX_A)).toEqual({ ok: true });
  });

  it("un movimiento que no está en la lista no existe para ella", async () => {
    const lists = fakeLists({ findEntryAuthor: vi.fn().mockResolvedValue(null) });

    expect(await new RemoveEntryUseCase(lists, fakeMembers()).execute(OWNER, LIST_ID, TX_A)).toEqual({
      error: "transaction_not_found",
    });
  });
});

describe("ListEntriesUseCase", () => {
  it("un cursor ilegible es un error", async () => {
    const result = await new ListEntriesUseCase(fakeLists(), fakeMembers()).execute(OWNER, LIST_ID, {
      cursor: "nope",
      limit: 10,
    });

    expect(result).toEqual({ error: "invalid_cursor" });
  });

  it("pide uno más para saber si hay otra página", async () => {
    const lists = fakeLists();

    const result = await new ListEntriesUseCase(lists, fakeMembers()).execute(OWNER, LIST_ID, { limit: 10 });

    expect(lists.findEntries).toHaveBeenCalledWith(LIST_ID, null, 11);
    expect(result).toEqual({ items: [], nextCursor: null });
  });
});
