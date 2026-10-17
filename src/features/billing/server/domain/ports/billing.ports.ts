import type { PlanKey } from "../../../lib/plans";
import type { BillingProvider } from "../../../providers/types";

export interface BillingProviders {
  current(): BillingProvider;
  get(name: string): BillingProvider;
  isKnown(name: string): boolean;
}

export interface PlanCache {
  get(userId: string, load: () => Promise<PlanKey>): Promise<PlanKey>;
  forget(userId: string): Promise<void>;
}

export interface TestGrant {
  isEnabled(): boolean;
}

export interface BillingMonitor {
  warn(message: string, context: Record<string, unknown>): void;
  failed(error: unknown, message: string, context: Record<string, unknown>): void;
}
