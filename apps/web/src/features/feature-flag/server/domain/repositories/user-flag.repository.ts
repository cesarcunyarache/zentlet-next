import type { UserFlagAssignment, UserOverrides } from "../entities/feature-flag.entity";

export interface UserFlagRepository {
  findOverrides(userId: string): Promise<UserOverrides>;

  assign(userId: string, slug: string, enabled: boolean, actor: string): Promise<UserFlagAssignment | "flag_not_found">;

  clear(userId: string, slug: string): Promise<void>;
}
