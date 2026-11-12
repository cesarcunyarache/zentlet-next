export class InvalidLanguageError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a supported language`);
    this.name = 'InvalidLanguageError';
  }
}

export class InvalidCurrencyError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a supported currency`);
    this.name = 'InvalidCurrencyError';
  }
}

export class InvalidTimezoneError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a valid timezone`);
    this.name = 'InvalidTimezoneError';
  }
}

export class EmptyPreferenceUpdateError extends Error {
  constructor() {
    super('A preference update must change at least one field');
    this.name = 'EmptyPreferenceUpdateError';
  }
}
