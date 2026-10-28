import { GetLocalDateUseCase } from "../application/use-cases/get-local-date.use-case";
import { GetPreferencesUseCase } from "../application/use-cases/get-preferences.use-case";
import { UpdatePreferencesUseCase } from "../application/use-cases/update-preferences.use-case";
import { PrismaPreferenceRepository } from "./persistence/prisma/prisma-preference.repository";

const repository = new PrismaPreferenceRepository();

export const preferenceUseCases = {
  get: new GetPreferencesUseCase(repository),
  update: new UpdatePreferencesUseCase(repository),
  localDate: new GetLocalDateUseCase(repository),
};
