import { fail } from "../../domain/errors/feature-flag.errors";
import type { FlagCache, UserDirectory } from "../../domain/ports/feature-flag.ports";
import type { UserFlagRepository } from "../../domain/repositories/user-flag.repository";

export class AssignUserFlagUseCase {
  constructor(
    private readonly userDirectory: UserDirectory,
    private readonly userFlagRepository: UserFlagRepository,
    private readonly flagCache: FlagCache,
  ) {}

  async execute(email: string, slug: string, enabled: boolean, actor: string) {
    const userId = await this.userDirectory.findIdByEmail(email);
    if (!userId) return fail("user_not_found");

    const assignment = await this.userFlagRepository.assign(userId, slug, enabled, actor);
    if (assignment === "flag_not_found") return fail("flag_not_found");

    await this.flagCache.forgetUser(userId);
    return { assignment };
  }
}
