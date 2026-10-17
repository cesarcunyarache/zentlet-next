import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationUseCases } from "@/features/notification/server/infrastructure/notification.container";
import { GET } from "../route";

vi.mock("@/features/notification/server/infrastructure/notification.container", () => ({
  notificationUseCases: { deliverPending: { execute: vi.fn() } },
}));

const deliverPending = vi.mocked(notificationUseCases.deliverPending.execute);

const SECRET = "cron-secret-for-tests";
const get = (authorization?: string) =>
  GET(new Request("http://localhost/api/cron/notifications", { headers: authorization ? { authorization } : {} }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  deliverPending.mockResolvedValue({ processed: 3 });
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
