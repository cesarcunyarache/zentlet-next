import { RunCleanupUseCase } from "../application/use-cases/run-cleanup.use-case";
import { maintenanceMonitor } from "./maintenance.adapters";
import { PrismaRetentionRepository } from "./persistence/prisma/prisma-retention.repository";

const repository = new PrismaRetentionRepository();

export const maintenanceUseCases = {
  cleanup: new RunCleanupUseCase(repository, maintenanceMonitor),
};
