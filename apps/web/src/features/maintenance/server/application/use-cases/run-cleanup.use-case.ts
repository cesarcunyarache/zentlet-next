import { DAY_MS, RETENTION_DAYS, type CleanupResult } from "../../domain/entities/cleanup.entity";
import type { MaintenanceMonitor } from "../../domain/ports/maintenance.ports";
import type { RetentionRepository } from "../../domain/repositories/retention.repository";

const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

export class RunCleanupUseCase {
  constructor(
    private readonly retentionRepository: RetentionRepository,
    private readonly maintenanceMonitor: MaintenanceMonitor,
  ) {}

  async execute(now = new Date()): Promise<CleanupResult> {
    const dayAgo = daysBefore(now, 1);
    const repository = this.retentionRepository;

    const [
      usageLimits,
      authRateLimits,
      sessions,
      verifications,
      notifications,
      inboxItems,
      whatsappMessages,
      whatsappLinkCodes,
      usersWithoutConsent,
    ] = await Promise.all([
      repository.deleteUsageLimitsBefore(dayAgo),
      repository.deleteAuthRateLimitsBefore(dayAgo),
      repository.deleteSessionsExpiredBy(now),
      repository.deleteVerificationsExpiredBy(now),
      repository.deleteNotificationsBefore(daysBefore(now, RETENTION_DAYS.notifications)),
      repository.deleteInboxItemsResolvedBefore(daysBefore(now, RETENTION_DAYS.resolvedInboxItems)),
      repository.deleteWhatsappMessagesBefore(daysBefore(now, RETENTION_DAYS.whatsappMessages)),
      repository.deleteWhatsappLinkCodesExpiredBy(now),
      repository.countUsersWithoutConsentCreatedBefore(dayAgo),
    ]);

    const deleted = {
      usageLimits,
      authRateLimits,
      sessions,
      verifications,
      notifications,
      inboxItems,
      whatsappMessages,
      whatsappLinkCodes,
    };
    this.maintenanceMonitor.cleaned(deleted);
    if (usersWithoutConsent > 0) this.maintenanceMonitor.usersWithoutConsent(usersWithoutConsent);

    return { deleted, usersWithoutConsent };
  }
}
