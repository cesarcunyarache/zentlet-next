import { describe, expect, it, vi } from "vitest";
import { ListInvitesUseCase } from "../list-invites.use-case";
import { fakeInvites, fakeMembers, LIST_ID, membership, OWNER, storedInvite } from "./fakes";

const NOW = new Date("2026-10-10T00:00:00Z");

describe("ListInvitesUseCase", () => {
  it("quien administra la lista ve las invitaciones vigentes", async () => {
    const invites = fakeInvites({ findActive: vi.fn().mockResolvedValue([storedInvite()]) });
    const members = fakeMembers({ find: vi.fn().mockResolvedValue(membership(OWNER, "owner")) });

    const result = await new ListInvitesUseCase(invites, members).execute(OWNER, LIST_ID, NOW);

    expect(result).toEqual({ invites: [storedInvite()] });
    expect(invites.findActive).toHaveBeenCalledWith(LIST_ID, NOW);
  });

  it("un miembro que no administra es forbidden y quien no es miembro, not_found", async () => {
    const invites = fakeInvites();
    const viewer = fakeMembers({ find: vi.fn().mockResolvedValue(membership("viewer-1", "viewer")) });
    const stranger = fakeMembers({ find: vi.fn().mockResolvedValue(null) });

    expect(await new ListInvitesUseCase(invites, viewer).execute("viewer-1", LIST_ID, NOW)).toEqual({ error: "forbidden" });
    expect(await new ListInvitesUseCase(invites, stranger).execute("x", LIST_ID, NOW)).toEqual({ error: "not_found" });
    expect(invites.findActive).not.toHaveBeenCalled();
  });
});
