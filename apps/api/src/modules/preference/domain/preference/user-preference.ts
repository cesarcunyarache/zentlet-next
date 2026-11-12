export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const SUPPORTED_CURRENCIES = ['PEN', 'USD', 'EUR', 'COP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';
export const DEFAULT_CURRENCY: Currency = 'PEN';
export const DEFAULT_TIMEZONE = 'America/Lima';

const TIMEZONE_MAX_LENGTH = 64;

export type UserPreference = {
  language: Language;
  currency: Currency;
  timezone: string;
  extras: Record<string, never>;
};

export function isSupportedLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function isValidTimezone(value: string): boolean {
  if (value.length < 1 || value.length > TIMEZONE_MAX_LENGTH) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

type StoredUserPreference = {
  language: string;
  currency: string;
  timezone: string;
  extras: unknown;
};

/**
 * A stored row may hold a value that is no longer supported (a retired locale, a
 * dropped currency, extras from a schema that has since changed shape). Reads fall
 * back to the defaults for that value instead of failing, matching the web app.
 */
export function sanitizeStoredUserPreference(stored: StoredUserPreference): UserPreference {
  return {
    language: isSupportedLanguage(stored.language) ? stored.language : DEFAULT_LANGUAGE,
    currency: isSupportedCurrency(stored.currency) ? stored.currency : DEFAULT_CURRENCY,
    timezone: isValidTimezone(stored.timezone) ? stored.timezone : DEFAULT_TIMEZONE,
    extras: {},
  };
}
