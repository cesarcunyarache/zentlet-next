import { FlagStates } from "../application/services/flag-states.service";
import { AssignUserFlagUseCase } from "../application/use-cases/assign-user-flag.use-case";
import { ClearUserFlagUseCase } from "../application/use-cases/clear-user-flag.use-case";
import { CreateFlagUseCase } from "../application/use-cases/create-flag.use-case";
import { DeleteFlagUseCase } from "../application/use-cases/delete-flag.use-case";
import { GetEnabledFlagsUseCase } from "../application/use-cases/get-enabled-flags.use-case";
import { IsFlagEnabledUseCase } from "../application/use-cases/is-flag-enabled.use-case";
import { ListFlagsUseCase } from "../application/use-cases/list-flags.use-case";
import { UpdateFlagUseCase } from "../application/use-cases/update-flag.use-case";
import { flagCache, flagMonitor, userDirectory } from "./feature-flag.adapters";
import { PrismaFeatureFlagRepository } from "./persistence/prisma/prisma-feature-flag.repository";
import { PrismaUserFlagRepository } from "./persistence/prisma/prisma-user-flag.repository";

const flags = new PrismaFeatureFlagRepository();
const userFlags = new PrismaUserFlagRepository();
const flagStates = new FlagStates(flags, userFlags, flagCache);

export const featureFlagUseCases = {
  getEnabled: new GetEnabledFlagsUseCase(flagStates),
  isEnabled: new IsFlagEnabledUseCase(flagStates, flags, flagCache, flagMonitor),
  list: new ListFlagsUseCase(flags),
  create: new CreateFlagUseCase(flags, flagCache),
  update: new UpdateFlagUseCase(flags, flagCache),
  delete: new DeleteFlagUseCase(flags, flagCache),
  assignUser: new AssignUserFlagUseCase(userDirectory, userFlags, flagCache),
  clearUser: new ClearUserFlagUseCase(userDirectory, userFlags, flagCache),
};
