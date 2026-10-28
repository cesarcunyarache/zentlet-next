import { describe, expect, it, vi } from "vitest";
import type { MaintenanceMonitor } from "../../../domain/ports/maintenance.ports";
import type { RetentionRepository } from "../../../domain/repositories/retention.repository";
import { RunCleanupUseCase } from "../run-cleanup.use-case";

const NOW = new Date("2026-09-29T09:00:00.000Z");

function setup(usersWithoutConsent = 0) {
  const deleteTwo = () => vi.fn().mockResolvedValue(2);
  const repository: RetentionRepository = {
    deleteUsageLimitsBefore: deleteTwo(),
    deleteAuthRateLimitsBefore: deleteTwo(),
    deleteSessionsExpiredBy: deleteTwo(),
    deleteVerificationsExpiredBy: deleteTwo(),
    deleteNotificationsBefore: deleteTwo(),
    deleteInboxItemsResolvedBefore: deleteTwo(),
    deleteWhatsappMessagesBefore: deleteTwo(),
    deleteWhatsappLinkCodesExpiredBy: deleteTwo(),
    countUsersWithoutConsentCreatedBefore: vi.fn().mockResolvedValue(usersWithoutConsent),
  };
  const monitor: MaintenanceMonitor = { cleaned: vi.fn(), usersWithoutConsent: vi.fn() };
  return { repository, monitor, useCase: new RunCleanupUseCase(repository, monitor) };
}

describe("RunCleanupUseCase", () => {
  it("aplica cada plazo de retención", async () => {
    const { useCase, repository } = setup();

    await useCase.execute(NOW);

    const dayAgo = new Date("2026-09-28T09:00:00.000Z");
    expect(repository.deleteUsageLimitsBefore).toHaveBeenCalledWith(dayAgo);
    expect(repository.deleteSessionsExpiredBy).toHaveBeenCalledWith(NOW);
    expect(repository.deleteNotificationsBefore).toHaveBeenCalledWith(new Date("2026-07-01T09:00:00.000Z"));
    expect(repository.deleteInboxItemsResolvedBefore).toHaveBeenCalledWith(new Date("2026-08-30T09:00:00.000Z"));
    expect(repository.deleteWhatsappMessagesBefore).toHaveBeenCalledWith(new Date("2026-09-22T09:00:00.000Z"));
    expect(repository.countUsersWithoutConsentCreatedBefore).toHaveBeenCalledWith(dayAgo);
  });

  it("devuelve y registra cuánto borró; sin usuarios sin consentimiento no avisa", async () => {
    const { useCase, monitor } = setup(0);

    const result = await useCase.execute(NOW);

    expect(result.deleted.sessions).toBe(2);
    expect(result.usersWithoutConsent).toBe(0);
    expect(monitor.cleaned).toHaveBeenCalledWith(result.deleted);
    expect(monitor.usersWithoutConsent).not.toHaveBeenCalled();
  });

  it("avisa si hay cuentas de más de un día sin consentimiento legal", async () => {
    const { useCase, monitor } = setup(3);

    await useCase.execute(NOW);

    expect(monitor.usersWithoutConsent).toHaveBeenCalledWith(3);
  });
});
