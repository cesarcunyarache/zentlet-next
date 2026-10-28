import { describe, expect, it, vi } from "vitest";
import type { PreferenceRepository } from "../../../domain/repositories/preference.repository";
import { GetLocalDateUseCase } from "../get-local-date.use-case";

const MIDNIGHT_UTC = new Date("2026-10-07T03:00:00.000Z");

function repositoryWith(timezone: string | null): PreferenceRepository {
  return { find: vi.fn(), save: vi.fn(), findTimezone: vi.fn().mockResolvedValue(timezone) };
}

describe("GetLocalDateUseCase", () => {
  it("devuelve la fecha del usuario en su zona horaria", async () => {
    const useCase = new GetLocalDateUseCase(repositoryWith("Asia/Tokyo"));
    expect(await useCase.execute("user-1", MIDNIGHT_UTC)).toBe("2026-10-07");
  });

  it("sin zona guardada usa la de Lima", async () => {
    const useCase = new GetLocalDateUseCase(repositoryWith(null));
    expect(await useCase.execute("user-1", MIDNIGHT_UTC)).toBe("2026-10-06");
  });
});
