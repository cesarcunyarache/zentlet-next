import { describe, expect, it } from "vitest";
import { RemoveMemberUseCase } from "../remove-member.usecase";
import { UpdateMemberUseCase } from "../update-member.usecase";
import { LIST_ID, OWNER, membersWithRoles } from "../../__tests__/fakes";

const roles = () => membersWithRoles({ [OWNER]: "owner", ed: "editor", v: "viewer" });

describe("UpdateMemberUseCase", () => {
  it("el dueño cambia el rol de un miembro", async () => {
    const members = roles();

    expect(await new UpdateMemberUseCase(members).execute(OWNER, LIST_ID, "v", { role: "editor" })).toEqual({ ok: true });
    expect(members.updateRole).toHaveBeenCalledWith(LIST_ID, "v", "editor");
  });

  it("nadie puede quitarle el rol al dueño", async () => {
    expect(await new UpdateMemberUseCase(roles()).execute(OWNER, LIST_ID, OWNER, { role: "viewer" })).toEqual({
      error: "forbidden",
    });
  });

  it("un editor no cambia roles", async () => {
    expect(await new UpdateMemberUseCase(roles()).execute("ed", LIST_ID, "v", { role: "editor" })).toEqual({
      error: "forbidden",
    });
  });
});

describe("RemoveMemberUseCase", () => {
  it("cualquiera puede salir de la lista", async () => {
    const members = roles();

    expect(await new RemoveMemberUseCase(members).execute("v", LIST_ID, "v")).toEqual({ ok: true });
    expect(members.remove).toHaveBeenCalledWith(LIST_ID, "v");
  });

  it("el dueño no puede salir: debe eliminar la lista", async () => {
    expect(await new RemoveMemberUseCase(roles()).execute(OWNER, LIST_ID, OWNER)).toEqual({
      error: "owner_cannot_leave",
    });
  });

  it("el dueño saca a un miembro, un editor no", async () => {
    const members = roles();

    expect(await new RemoveMemberUseCase(members).execute(OWNER, LIST_ID, "ed")).toEqual({ ok: true });
    expect(await new RemoveMemberUseCase(members).execute("ed", LIST_ID, "v")).toEqual({ error: "forbidden" });
  });

  it("sacar a alguien que no está es un error", async () => {
    expect(await new RemoveMemberUseCase(roles()).execute(OWNER, LIST_ID, "ghost")).toEqual({
      error: "member_not_found",
    });
  });
});
