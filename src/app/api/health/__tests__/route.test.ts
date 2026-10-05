import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDatabaseCheck, runHealthChecks } from "@/lib/health/checks";
import prisma from "@/lib/prisma";
import { GET } from "../route";

/*
 * Sin credencial sólo se sabe si la base de datos responde: ni la
 * configuración de los servicios ni llamadas a terceros.
 */

vi.mock("@/lib/health/checks", () => ({ runDatabaseCheck: vi.fn(), runHealthChecks: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { $queryRaw: vi.fn() } }));

const TOKEN = "health-token-for-tests-000000000";
const database = { id: "database", name: "Base de datos", status: "ok", detail: "Conectada" } as const;
const gemini = { id: "gemini", name: "Gemini (IA)", status: "error", detail: "Clave inválida" } as const;

const get = (authorization?: string) =>
  GET(new Request("http://localhost/api/health", { headers: authorization ? { authorization } : {} }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("HEALTH_TOKEN", TOKEN);
  vi.mocked(runDatabaseCheck).mockResolvedValue(database);
  vi.mocked(runHealthChecks).mockResolvedValue([database, gemini]);
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ count: 1 }] as never);
});

describe("GET /api/health", () => {
  it("sin token: sólo el estado de la base de datos, sin detalle ni terceros", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.checks).toBeUndefined();
    expect(runHealthChecks).not.toHaveBeenCalled();
  });

  it("sin token y con la base de datos caída: 503", async () => {
    vi.mocked(runDatabaseCheck).mockResolvedValue({ ...database, status: "error" });

    const response = await get();

    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("down");
  });

  it("con un token incorrecto: 401 y ningún check", async () => {
    expect((await get("Bearer otro-token")).status).toBe(401);
    expect((await get(`Bearer ${TOKEN}x`)).status).toBe(401);
    expect(runHealthChecks).not.toHaveBeenCalled();
    expect(runDatabaseCheck).not.toHaveBeenCalled();
  });

  it("sin HEALTH_TOKEN configurado no hay informe detallado", async () => {
    vi.stubEnv("HEALTH_TOKEN", "");

    expect((await get(`Bearer ${TOKEN}`)).status).toBe(401);
  });

  it("con el token: el detalle de cada servicio", async () => {
    const response = await get(`Bearer ${TOKEN}`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.checks).toHaveLength(2);
  });
});
