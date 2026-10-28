import { describe, expect, it, vi } from "vitest";
import { CreateFlagUseCase } from "../create-flag.use-case";
import { DeleteFlagUseCase } from "../delete-flag.use-case";
import { GetEnabledFlagsUseCase } from "../get-enabled-flags.use-case";
import { fakeFeatureFlags } from "./fake-feature-flags";

describe("CreateFlagUseCase", () => {
  it("crea el flag apagado a nombre del autor y olvida la caché", async () => {
    const { flags, cache } = fakeFeatureFlags();

    const result = await new CreateFlagUseCase(flags, cache).execute({ slug: "beta", type: "EXPERIMENT" }, "cli:ana");

    expect(result).toMatchObject({ flag: { slug: "beta" } });
    expect(flags.insert).toHaveBeenCalledWith({ slug: "beta", type: "EXPERIMENT" }, "cli:ana");
    expect(cache.forgetFlag).toHaveBeenCalledWith("beta");
  });

  it("un slug repetido es slug_taken y no toca la caché", async () => {
    const { flags, cache } = fakeFeatureFlags();
    vi.mocked(flags.insert).mockResolvedValue("slug_taken");

    expect(await new CreateFlagUseCase(flags, cache).execute({ slug: "beta" }, "cli")).toEqual({ error: "slug_taken" });
    expect(cache.forgetFlag).not.toHaveBeenCalled();
  });
});

describe("DeleteFlagUseCase", () => {
  it("borra el flag y olvida la caché", async () => {
    const { flags, cache } = fakeFeatureFlags();

    expect(await new DeleteFlagUseCase(flags, cache).execute("beta")).toEqual({ ok: true });
    expect(cache.forgetFlag).toHaveBeenCalledWith("beta");
  });

  it("un flag que no existe es flag_not_found", async () => {
    const { flags, cache } = fakeFeatureFlags();
    vi.mocked(flags.delete).mockResolvedValue("flag_not_found");

    expect(await new DeleteFlagUseCase(flags, cache).execute("nope")).toEqual({ error: "flag_not_found" });
    expect(cache.forgetFlag).not.toHaveBeenCalled();
  });
});

describe("GetEnabledFlagsUseCase", () => {
  it("devuelve ordenados los flags encendidos para el usuario, con su asignación por encima del porcentaje", async () => {
    const { flags, userFlags, states } = fakeFeatureFlags();
    vi.mocked(flags.findDefinitions).mockResolvedValue([
      { slug: "zeta", enabled: true, rollout: 100 },
      { slug: "beta", enabled: true, rollout: 0 },
      { slug: "apagado", enabled: false, rollout: 100 },
      { slug: "alfa", enabled: true, rollout: 100 },
    ]);
    vi.mocked(userFlags.findOverrides).mockResolvedValue({ beta: true, alfa: false, apagado: true });

    expect(await new GetEnabledFlagsUseCase(states).execute("user-1")).toEqual(["beta", "zeta"]);
  });
});
