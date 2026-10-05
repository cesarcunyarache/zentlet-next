import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET as flagsRoute } from "@/app/api/account/features/route";
import { createUser, resetDatabase } from "@/test/integration/database";
import { clearUserFlag, createFlag, deleteFlag, setFlagEnabled, setFlagRollout, setUserFlag } from "../server/admin";
import { getEnabledFlags, isFlagEnabled } from "../server/flags";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

const ACTOR = "test";
let user: { id: string; email: string };

beforeEach(async () => {
  await resetDatabase();
  user = await createUser();
});

describe("feature flags con Postgres", () => {
  it("un flag nuevo está apagado y uno inexistente también", async () => {
    await createFlag({ slug: "new-home" }, ACTOR);

    expect(await isFlagEnabled(user.id, "new-home")).toBe(false);
    expect(await isFlagEnabled(user.id, "does-not-exist")).toBe(false);
  });

  it("encenderlo globalmente lo activa para todos y guarda quién lo cambió", async () => {
    await createFlag({ slug: "new-home", type: "EXPERIMENT", description: "Inicio nuevo" }, ACTOR);
    await setFlagEnabled("new-home", true, "cli:ana");
    const other = await createUser();

    expect(await getEnabledFlags(user.id)).toEqual(["new-home"]);
    expect(await getEnabledFlags(other.id)).toEqual(["new-home"]);
    expect(await prisma.feature.findUnique({ where: { slug: "new-home" } })).toMatchObject({
      type: "EXPERIMENT",
      description: "Inicio nuevo",
      updatedBy: "cli:ana",
    });
  });

  it("encendido, la asignación a un usuario gana al porcentaje en ambos sentidos", async () => {
    await createFlag({ slug: "beta" }, ACTOR);
    await createFlag({ slug: "rollout" }, ACTOR);
    await setFlagEnabled("beta", true, ACTOR);
    await setFlagRollout("beta", 0, ACTOR);
    await setFlagEnabled("rollout", true, ACTOR);
    const other = await createUser();

    await setUserFlag(user.email, "beta", true, "cli:ana");
    await setUserFlag(user.email, "rollout", false, ACTOR);

    expect(await getEnabledFlags(user.id)).toEqual(["beta"]);
    expect(await getEnabledFlags(other.id)).toEqual(["rollout"]);
    expect(
      await prisma.userFeature.findUnique({ where: { userId_featureId: { userId: user.id, featureId: "beta" } } }),
    ).toMatchObject({ enabled: true, assignedBy: "cli:ana" });
  });

  it("apagarlo es un interruptor de emergencia: nadie lo tiene, ni siquiera con grant", async () => {
    await createFlag({ slug: "beta" }, ACTOR);
    await setFlagEnabled("beta", true, ACTOR);
    await setUserFlag(user.email, "beta", true, ACTOR);
    expect(await isFlagEnabled(user.id, "beta")).toBe(true);

    await setFlagEnabled("beta", false, ACTOR);

    expect(await isFlagEnabled(user.id, "beta")).toBe(false);
    expect(await getEnabledFlags(user.id)).toEqual([]);
  });

  it("el porcentaje reparte a los usuarios y subirlo conserva a los que ya lo tenían", async () => {
    await createFlag({ slug: "new-home" }, ACTOR);
    await setFlagEnabled("new-home", true, ACTOR);
    const ids = (await Promise.all(Array.from({ length: 200 }, () => createUser()))).map(({ id }) => id);
    const withFlag = async () =>
      (await Promise.all(ids.map(async (id) => ((await isFlagEnabled(id, "new-home")) ? id : null)))).filter(Boolean);

    await setFlagRollout("new-home", 10, ACTOR);
    const at10 = await withFlag();
    await setFlagRollout("new-home", 50, ACTOR);
    const at50 = new Set(await withFlag());

    expect(at10.length).toBeGreaterThan(5);
    expect(at10.length).toBeLessThan(40);
    expect(at50.size).toBeGreaterThan(70);
    expect(at50.size).toBeLessThan(130);
    expect(at10.every((id) => at50.has(id))).toBe(true);
  });

  it("el porcentaje sólo admite enteros de 0 a 100", async () => {
    await createFlag({ slug: "beta" }, ACTOR);

    await expect(setFlagRollout("beta", 150, ACTOR)).rejects.toThrow("0 to 100");
    await expect(prisma.feature.update({ where: { slug: "beta" }, data: { rollout: 150 } })).rejects.toThrow();
    expect((await prisma.feature.findUniqueOrThrow({ where: { slug: "beta" } })).rollout).toBe(100);
  });

  it("quitar la asignación devuelve al usuario al porcentaje", async () => {
    await createFlag({ slug: "beta" }, ACTOR);
    await setFlagEnabled("beta", true, ACTOR);
    await setFlagRollout("beta", 0, ACTOR);
    await setUserFlag(user.email, "beta", true, ACTOR);

    await clearUserFlag(user.email, "beta");

    expect(await isFlagEnabled(user.id, "beta")).toBe(false);
  });

  it("asignar a un correo inexistente falla sin crear nada", async () => {
    await createFlag({ slug: "beta" }, ACTOR);

    await expect(setUserFlag("nadie@example.com", "beta", true, ACTOR)).rejects.toThrow("No user with email");
    expect(await prisma.userFeature.count()).toBe(0);
  });

  it("borrar el flag o el usuario borra sus asignaciones", async () => {
    await createFlag({ slug: "beta" }, ACTOR);
    await createFlag({ slug: "other" }, ACTOR);
    await setUserFlag(user.email, "beta", true, ACTOR);
    await setUserFlag(user.email, "other", true, ACTOR);

    await deleteFlag("beta");
    expect(await prisma.userFeature.count()).toBe(1);

    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.userFeature.count()).toBe(0);
  });

  it("comprobar un flag registra su último uso como mucho una vez al día", async () => {
    await createFlag({ slug: "beta" }, ACTOR);

    await isFlagEnabled(user.id, "beta");
    const first = (await prisma.feature.findUniqueOrThrow({ where: { slug: "beta" } })).lastUsedAt;
    await isFlagEnabled(user.id, "beta");
    const second = (await prisma.feature.findUniqueOrThrow({ where: { slug: "beta" } })).lastUsedAt;

    expect(first).toBeInstanceOf(Date);
    expect(second).toEqual(first);
  });

  it("la API devuelve los flags del usuario de la sesión", async () => {
    await createFlag({ slug: "beta" }, ACTOR);
    await setFlagEnabled("beta", true, ACTOR);
    await setFlagRollout("beta", 0, ACTOR);
    await setUserFlag(user.email, "beta", true, ACTOR);
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await flagsRoute(new Request("http://localhost/api/account/features"));

    expect(await response.json()).toEqual({ enabled: ["beta"] });
  });
});
