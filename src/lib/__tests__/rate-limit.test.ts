import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { reportError } from "@/lib/observability/server";
import { rateLimit } from "../rate-limit";

let counter: number | null = null;

vi.mock("@/lib/kv", () => ({ withKeyValueStore: vi.fn(async () => counter) }));
vi.mock("@/lib/prisma", () => ({ default: { $queryRaw: vi.fn() } }));
vi.mock("@/lib/observability/server", () => ({ reportError: vi.fn() }));

const queryRaw = vi.mocked(prisma.$queryRaw);

beforeEach(() => {
  vi.clearAllMocks();
  counter = null;
});

describe("rateLimit", () => {
  it("con almacén cuenta ahí y no toca la base de datos", async () => {
    counter = 3;
    expect(await rateLimit("writes:u1", 3, 60_000)).toEqual({ allowed: true, count: 3 });
    counter = 4;
    expect(await rateLimit("writes:u1", 3, 60_000)).toEqual({ allowed: false, count: 4 });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("sin almacén (o caído) cuenta en la base de datos", async () => {
    queryRaw.mockResolvedValue([{ count: 2 }] as never);
    expect(await rateLimit("writes:u1", 3, 60_000)).toEqual({ allowed: true, count: 2 });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("si tampoco responde la base de datos, deja pasar y lo reporta", async () => {
    queryRaw.mockRejectedValue(new Error("db down"));
    expect(await rateLimit("writes:u1", 3, 60_000)).toEqual({ allowed: true, count: 0 });
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), "rate_limit.unavailable", { key: "writes" });
  });
});
