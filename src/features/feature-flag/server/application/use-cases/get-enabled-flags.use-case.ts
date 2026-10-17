import { enabledSlugs } from "../../../lib/resolve";
import type { FlagStates } from "../services/flag-states.service";

export class GetEnabledFlagsUseCase {
  constructor(private readonly flagStates: FlagStates) {}

  async execute(userId: string) {
    const states = await this.flagStates.forUser(userId);
    return enabledSlugs(states, userId);
  }
}
