import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { reportError } from "@/lib/observability/server";
import { PATCH } from "../route";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/observability/server", () => ({ reportError: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    category: { findFirst: vi.fn() },
    transaction: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const db = vi.mocked(prisma, { deep: true });

const patch = (payload: unknown) =>
  PATCH(
    new Request("http://localhost/api/transaction/t1", {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "x-vercel-id": "iad1::abc" },
    }),
    { params: Promise.resolve({ id: "t1" }) },
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "user-1" } } as never);
  db.$queryRaw.mockResolvedValue([{ count: 1 }] as never);
  db.category.findFirst.mockResolvedValue({ id: "c2" } as never);
});

describe("PATCH /api/transaction/[id]", () => {
  it("la categoría borrada entre la comprobación y la actualización es 422", async () => {
    db.transaction.updateMany.mockRejectedValue(Object.assign(new Error("fk"), { code: "P2003" }));

    const response = await patch({ categoryId: "c2" });

    expect(response.status).toBe(422);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("un error inesperado es 500 y se reporta con el usuario y el id de la petición", async () => {
    db.transaction.updateMany.mockRejectedValue(new Error("db down"));

    const response = await patch({ description: "Taxi" });

    expect(response.status).toBe(500);
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      "Error updating transaction",
      expect.objectContaining({ userId: "user-1", requestId: "iad1::abc", method: "PATCH" }),
    );
  });
});
