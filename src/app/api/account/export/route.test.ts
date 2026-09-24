import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({
  default: {
    transaction: { findMany: vi.fn() },
    category: { findMany: vi.fn() },
  },
}));

const db = vi.mocked(prisma, { deep: true });
const getSession = vi.mocked(auth.api.getSession);

// cada test usa su propio usuario: el límite por minuto vive en memoria
let userId = 0;
function signIn() {
  userId += 1;
  getSession.mockResolvedValue({ user: { id: `user-${userId}` } } as never);
  return `user-${userId}`;
}

const exportFile = (query = "") => GET(new Request(`http://localhost/api/account/export${query}`));

beforeEach(() => {
  vi.resetAllMocks();
  db.transaction.findMany.mockResolvedValue([
    {
      transactionDate: new Date("2026-09-20T00:00:00.000Z"),
      type: "expense",
      amount: { toString: () => "25.5" },
      description: "Farmacia",
      reference: null,
      category: { name: "Salud" },
    },
  ] as never);
  db.category.findMany.mockResolvedValue([]);
});

describe("GET /api/account/export", () => {
  it("sin sesión es 401 y no consulta nada", async () => {
    getSession.mockResolvedValue(null);
    expect((await exportFile()).status).toBe(401);
    expect(db.transaction.findMany).not.toHaveBeenCalled();
  });

  it("devuelve un .xlsx descargable sin cache", async () => {
    signIn();
    const response = await exportFile("?locale=es");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="zentlet-\d{4}-\d{2}-\d{2}\.xlsx"$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 2).toString()).toBe("PK");
  });

  it("sólo lee los datos del usuario de la sesión", async () => {
    const user = signIn();
    await exportFile();

    expect(db.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: user } }));
    expect(db.category.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: user } }));
  });

  it("limita a 5 exportaciones por minuto y usuario", async () => {
    signIn();
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await exportFile()).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("un fallo de la base de datos es 500 genérico", async () => {
    signIn();
    db.transaction.findMany.mockRejectedValue(new Error("connection lost"));

    const response = await exportFile();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Error exporting data" });
  });
});
