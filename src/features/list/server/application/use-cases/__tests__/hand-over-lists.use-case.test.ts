import { describe, expect, it, vi } from "vitest";
import { HandOverListsUseCase } from "../hand-over-lists.use-case";
import { LIST_ID, OWNER, fakeLists, fakeMembers, fakeNotifier, membership } from "./fakes";

const day = (n: number) => new Date(`2026-10-${String(n).padStart(2, "0")}T00:00:00Z`);

describe("HandOverListsUseCase", () => {
  it("pasa la lista al editor más antiguo antes que a un lector y le avisa", async () => {
    const lists = fakeLists({ findOwnedIds: vi.fn().mockResolvedValue([LIST_ID]) });
    const members = fakeMembers({
      findAll: vi.fn().mockResolvedValue([
        membership(OWNER, "owner", day(1)),
        membership("viewer-old", "viewer", day(2)),
        membership("editor-new", "editor", day(5)),
        membership("editor-old", "editor", day(3)),
      ]),
    });
    const notifier = fakeNotifier();

    await new HandOverListsUseCase(lists, members, notifier).execute(OWNER);

    expect(members.transferOwnership).toHaveBeenCalledWith(LIST_ID, OWNER, "editor-old");
    expect(lists.delete).not.toHaveBeenCalled();
    expect(notifier.ownershipReceived).toHaveBeenCalledWith("editor-old", { listId: LIST_ID, listName: "Viaje a Cusco" });
  });

  it("sin nadie más, la lista se elimina", async () => {
    const lists = fakeLists({ findOwnedIds: vi.fn().mockResolvedValue([LIST_ID]) });
    const members = fakeMembers();

    await new HandOverListsUseCase(lists, members, fakeNotifier()).execute(OWNER);

    expect(lists.delete).toHaveBeenCalledWith(LIST_ID);
    expect(members.transferOwnership).not.toHaveBeenCalled();
  });
});
