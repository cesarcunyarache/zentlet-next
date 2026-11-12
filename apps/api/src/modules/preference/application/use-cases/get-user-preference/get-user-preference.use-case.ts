import { Injectable } from '@nestjs/common';
import type { UserPreference } from '../../../domain/preference/user-preference.js';
import { UserPreferenceRepository } from '../../../domain/preference/user-preference.repository.js';
import type { GetUserPreferenceInput } from './get-user-preference.input.js';

@Injectable()
export class GetUserPreferenceUseCase {
  constructor(private readonly userPreferenceRepository: UserPreferenceRepository) {}

  async execute(input: GetUserPreferenceInput): Promise<UserPreference | null> {
    return this.userPreferenceRepository.findByUserId(input.userId);
  }
}
