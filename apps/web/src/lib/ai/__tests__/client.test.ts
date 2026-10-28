import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { reportError } from "@/lib/observability/server";

const generate = vi.fn();
const check = vi.fn();

vi.mock("../adapters/google", () => ({
  createGoogleGenerator: () => ({ model: "test-model", generate, check }),
}));
vi.mock("@/lib/observability/server", () => ({ reportError: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn() } }));

async function loadClient(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  return import("../client");
}

const request = { operation: "test.op", prompt: "hola", schema: z.object({ ok: z.boolean() }) };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("generateObject", () => {
  it("delega en el adaptador del proveedor con el timeout por defecto", async () => {
    const { generateObject } = await loadClient({ GOOGLE_GENERATIVE_AI_API_KEY: "key", AI_PROVIDER: "" });
    generate.mockResolvedValue({ output: { ok: true }, inputTokens: 3, outputTokens: 1 });
    expect(await generateObject(request)).toEqual({ ok: true });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ operation: "test.op", timeoutMs: 10_000 }));
  });

  it("sin proveedor configurado lanza y lo reporta", async () => {
    const { generateObject } = await loadClient({ GOOGLE_GENERATIVE_AI_API_KEY: "" });
    await expect(generateObject(request)).rejects.toThrow("not configured");
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), "ai.generate_failed", expect.anything());
  });
});

describe("checkAi", () => {
  it("apagado sin clave, error con un proveedor desconocido y, configurado, lo comprueba el adaptador", async () => {
    expect((await (await loadClient({ GOOGLE_GENERATIVE_AI_API_KEY: "" })).checkAi()).status).toBe("off");
    expect((await (await loadClient({ AI_PROVIDER: "otro" })).checkAi()).status).toBe("error");
    check.mockResolvedValue({ status: "ok", detail: "Clave válida" });
    const { checkAi } = await loadClient({ AI_PROVIDER: "google", GOOGLE_GENERATIVE_AI_API_KEY: "key" });
    expect(await checkAi()).toEqual({ status: "ok", detail: "Clave válida" });
  });
});
