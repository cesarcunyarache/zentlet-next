import { describe, expect, it, vi } from "vitest";
import { DeleteListUseCase } from "../delete-list.usecase";
import { GetListUseCase } from "../get-list.usecase";
import { UpdateListUseCase } from "../update-list.usecase";
import { LIST_ID, OWNER, fakeLists, fakeMembers, membersWithRoles } from "../../__tests__/fakes";

describe("gestión de la lista", () => {
  it("quien no es miembro no la ve: responde como inexistente", async () => {
    const lists = fakeLists();
    const members = fakeMembers({ find: vi.fn().mockResolvedValue(null) });

    expect(await new GetListUseCase(lists, members).execute("stranger", LIST_ID)).toEqual({ error: "not_found" });
    expect(lists.findBreakdown).not.toHaveBeenCalled();
  });

  it("solo el dueño la edita", async () => {
    const lists = fakeLists();

    const result = await new UpdateListUseCase(lists, membersWithRoles({ ed: "editor" })).execute("ed", LIST_ID, {
      name: "Otro",
    });

    expect(result).toEqual({ error: "forbidden" });
    expect(lists.update).not.toHaveBeenCalled();
  });

  it("el dueño la elimina", async () => {
    const lists = fakeLists();

    expect(await new DeleteListUseCase(lists, fakeMembers()).execute(OWNER, LIST_ID)).toEqual({ ok: true });
    expect(lists.delete).toHaveBeenCalledWith(LIST_ID);
  });

  it("un editor no la elimina", async () => {
    const lists = fakeLists();

    const result = await new DeleteListUseCase(lists, membersWithRoles({ ed: "editor" })).execute("ed", LIST_ID);

    expect(result).toEqual({ error: "forbidden" });
    expect(lists.delete).not.toHaveBeenCalled();
  });
});
