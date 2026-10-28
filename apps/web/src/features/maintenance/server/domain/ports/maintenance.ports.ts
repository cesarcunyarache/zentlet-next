import type { DeletedCounts } from "../entities/cleanup.entity";

export interface MaintenanceMonitor {
  cleaned(deleted: DeletedCounts): void;
  usersWithoutConsent(count: number): void;
}
