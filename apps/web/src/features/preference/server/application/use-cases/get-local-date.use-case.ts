import { isoDateIn } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "../../../schemas/preference.schema";
import type { PreferenceRepository } from "../../domain/repositories/preference.repository";

export class GetLocalDateUseCase {
  constructor(private readonly preferenceRepository: PreferenceRepository) {}

  async execute(userId: string, at = new Date()) {
    const timezone = await this.preferenceRepository.findTimezone(userId);
    return isoDateIn(timezone ?? DEFAULT_TIMEZONE, at);
  }
}
