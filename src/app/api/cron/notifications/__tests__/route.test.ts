import { beforeEach, describe, expect, it, vi } from "vitest";
import { deliverPending } from "@/features/notification/server/deliver";
import { GET } from "./route";

vi.mock("@/features/notification/server/deliver", () => ({ deliverPending: vi.fn() }));

const SECRET = "cron-secret-for-tests";
const get = (authorization?: string) =>
  GET(new Request("http://localhost/api/cron/notifications", { headers: authorization ? { authorization } : {} }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.mocked(deliverPending).mockResolvedValue({ processed: 3 });
});

describe("GET /api/cron/notifications", () => {
  it("requires the cron secret", async () => {
    expect((await get("Bearer otro")).status).toBe(401);
    expect(deliverPending).not.toHaveBeenCalled();
  });

  it("delivers what is pending", async () => {
    const response = await get(`Bearer ${SECRET}`);

    expect(await response.json()).toEqual({ processed: 3 });
  });
});
