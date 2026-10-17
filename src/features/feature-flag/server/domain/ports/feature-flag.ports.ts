import type { FlagDefinition, UserOverrides } from "../entities/feature-flag.entity";

export interface FlagCache {
  definitions(load: () => Promise<FlagDefinition[]>): Promise<FlagDefinition[]>;
  userOverrides(userId: string, load: () => Promise<UserOverrides>): Promise<UserOverrides>;
  forgetFlag(slug: string): Promise<void>;
  forgetUser(userId: string): Promise<void>;
  claimUsageMark(slug: string): Promise<boolean>;
}

export interface UserDirectory {
  findIdByEmail(email: string): Promise<string | null>;
}

export interface FlagMonitor {
  evaluated(slug: string, isOn: boolean): void;
  usageMarkFailed(error: unknown, slug: string): void;
}
