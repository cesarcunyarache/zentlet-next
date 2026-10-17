import { describe, expect, it, vi } from "vitest";
import { UpdateFlagUseCase } from "../update-flag.use-case";
import { fakeFeatureFlags } from "./fake-feature-flags";

function setup() {
  const fakes = fakeFeatureFlags();
  return { ...fakes, useCase: new UpdateFlagUseCase(fakes.flags, fakes.cache) };
}

describe("UpdateFlagUseCase", () => {
  it("guarda el cambio con quién lo hizo y olvida la caché del flag", async () => {
    const { useCase, flags, cache } = setup();

    const result = await useCase.execute("beta", { enabled: true }, "cli:ana");

    expect(result).toMatchObject({ flag: { slug: "beta", enabled: true } });
    expect(flags.update).toHaveBeenCalledWith("beta", { enabled: true }, "cli:ana");
    expect(cache.forgetFlag).toHaveBeenCalledWith("beta");
  });

  it.each([150, -1, 12.5])("un porcentaje de %s es invalid_rollout y no escribe", async (rollout) => {
    const { useCase, flags } = setup();

    expect(await useCase.execute("beta", { rollout }, "cli:ana")).toEqual({ error: "invalid_rollout" });
    expect(flags.update).not.toHaveBeenCalled();
  });

  it("un flag que no existe es flag_not_found y no toca la caché", async () => {
    const { useCase, flags, cache } = setup();
    vi.mocked(flags.update).mockResolvedValue("flag_not_found");

    expect(await useCase.execute("nope", { stale: true }, "cli:ana")).toEqual({ error: "flag_not_found" });
    expect(cache.forgetFlag).not.toHaveBeenCalled();
  });
});
