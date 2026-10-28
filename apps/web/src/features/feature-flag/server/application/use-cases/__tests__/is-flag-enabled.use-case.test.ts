import { describe, expect, it, vi } from "vitest";
import { IsFlagEnabledUseCase } from "../is-flag-enabled.use-case";
import { fakeFeatureFlags } from "./fake-feature-flags";

function setup() {
  const fakes = fakeFeatureFlags();
  const useCase = new IsFlagEnabledUseCase(fakes.states, fakes.flags, fakes.cache, fakes.monitor);
  return { ...fakes, useCase };
}

describe("IsFlagEnabledUseCase", () => {
  it("un flag que no existe está apagado y no registra uso", async () => {
    const { useCase, flags, monitor } = setup();

    expect(await useCase.execute("user-1", "nope")).toBe(false);
    expect(flags.markUsed).not.toHaveBeenCalled();
    expect(monitor.evaluated).not.toHaveBeenCalled();
  });

  it("la asignación del usuario gana al porcentaje y la evaluación se reporta", async () => {
    const { useCase, flags, userFlags, monitor } = setup();
    vi.mocked(flags.findDefinitions).mockResolvedValue([{ slug: "beta", enabled: true, rollout: 0 }]);
    vi.mocked(userFlags.findOverrides).mockResolvedValue({ beta: true });

    expect(await useCase.execute("user-1", "beta")).toBe(true);
    expect(monitor.evaluated).toHaveBeenCalledWith("beta", true);
  });

  it("registra el uso sólo si es la primera comprobación de la ventana", async () => {
    const { useCase, flags, cache } = setup();
    vi.mocked(flags.findDefinitions).mockResolvedValue([{ slug: "beta", enabled: true, rollout: 100 }]);

    await useCase.execute("user-1", "beta");
    vi.mocked(cache.claimUsageMark).mockResolvedValue(false);
    await useCase.execute("user-1", "beta");

    expect(flags.markUsed).toHaveBeenCalledTimes(1);
  });

  it("si registrar el uso falla, avisa pero responde igual", async () => {
    const { useCase, flags, monitor } = setup();
    vi.mocked(flags.findDefinitions).mockResolvedValue([{ slug: "beta", enabled: true, rollout: 100 }]);
    vi.mocked(flags.markUsed).mockRejectedValue(new Error("db down"));

    expect(await useCase.execute("user-1", "beta")).toBe(true);
    expect(monitor.usageMarkFailed).toHaveBeenCalledWith(expect.any(Error), "beta");
  });
});
