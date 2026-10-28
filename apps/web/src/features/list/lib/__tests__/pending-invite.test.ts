import { describe, expect, it } from "vitest";
import { invitePath, inviteTokenFromPath } from "../pending-invite";

const TOKEN = "Abc_def-1234567890xyz";

describe("pending invite", () => {
  it("reconoce la ruta de una invitación y extrae el token", () => {
    expect(inviteTokenFromPath(invitePath(TOKEN))).toBe(TOKEN);
    expect(inviteTokenFromPath(`${invitePath(TOKEN)}/`)).toBe(TOKEN);
  });

  it("ignora cualquier otra ruta o un token con caracteres raros", () => {
    expect(inviteTokenFromPath("/admin")).toBeNull();
    expect(inviteTokenFromPath("/admin/list/abc")).toBeNull();
    expect(inviteTokenFromPath("/admin/list/invite/short")).toBeNull();
    expect(inviteTokenFromPath("/admin/list/invite/<script>alert(1)</script>")).toBeNull();
  });
});
