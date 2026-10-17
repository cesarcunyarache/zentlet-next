import { describe, expect, it, vi } from "vitest";
import { AssignUserFlagUseCase } from "../assign-user-flag.use-case";
import { ClearUserFlagUseCase } from "../clear-user-flag.use-case";
import { fakeFeatureFlags } from "./fake-feature-flags";

describe("AssignUserFlagUseCase", () => {
  it("asigna el flag al usuario del correo y olvida su caché", async () => {
    const { users, userFlags, cache } = fakeFeatureFlags();

    const result = await new AssignUserFlagUseCase(users, userFlags, cache).execute(
      "ana@example.com",
      "beta",
      true,
      "cli:ana",
    );

    expect(result).toMatchObject({ assignment: { userId: "user-1", featureId: "beta", enabled: true } });
    expect(cache.forgetUser).toHaveBeenCalledWith("user-1");
  });

  it("un correo sin usuario es user_not_found y no escribe", async () => {
    const { users, userFlags, cache } = fakeFeatureFlags();
    vi.mocked(users.findIdByEmail).mockResolvedValue(null);

    const result = await new AssignUserFlagUseCase(users, userFlags, cache).execute("x@y.z", "beta", true, "cli");

    expect(result).toEqual({ error: "user_not_found" });
    expect(userFlags.assign).not.toHaveBeenCalled();
  });

  it("un flag que no existe es flag_not_found", async () => {
    const { users, userFlags, cache } = fakeFeatureFlags();
    vi.mocked(userFlags.assign).mockResolvedValue("flag_not_found");

    const result = await new AssignUserFlagUseCase(users, userFlags, cache).execute("ana@example.com", "nope", true, "cli");

    expect(result).toEqual({ error: "flag_not_found" });
    expect(cache.forgetUser).not.toHaveBeenCalled();
  });
});

describe("ClearUserFlagUseCase", () => {
  it("quita la asignación y olvida la caché del usuario", async () => {
    const { users, userFlags, cache } = fakeFeatureFlags();

    expect(await new ClearUserFlagUseCase(users, userFlags, cache).execute("ana@example.com", "beta")).toEqual({ ok: true });
    expect(userFlags.clear).toHaveBeenCalledWith("user-1", "beta");
    expect(cache.forgetUser).toHaveBeenCalledWith("user-1");
  });
});
