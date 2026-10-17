import { fail } from "../../domain/errors/feature-flag.errors";
import type { FlagCache, UserDirectory } from "../../domain/ports/feature-flag.ports";
import type { UserFlagRepository } from "../../domain/repositories/user-flag.repository";

export class ClearUserFlagUseCase {
  constructor(
    private readonly userDirectory: UserDirectory,
    private readonly userFlagRepository: UserFlagRepository,
    private readonly flagCache: FlagCache,
  ) {}

  async execute(email: string, slug: string) {
    const userId = await this.userDirectory.findIdByEmail(email);
    if (!userId) return fail("user_not_found");

    await this.userFlagRepository.clear(userId, slug);
    await this.flagCache.forgetUser(userId);
    return { ok: true as const };
  }
}
