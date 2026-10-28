import { logger } from "@/lib/observability/logger";
import type { MaintenanceMonitor } from "../domain/ports/maintenance.ports";

export const maintenanceMonitor: MaintenanceMonitor = {
  cleaned: (deleted) => logger.info(deleted, "cron.cleanup"),
  usersWithoutConsent: (count) => logger.warn({ count }, "legal.users_without_consent"),
};
