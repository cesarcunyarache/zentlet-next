import type { Messages } from "next-intl";

/*
 * Errores de Better Auth → key de `auth.errors` / `auth.oauthErrors`. El
 * cliente los devuelve con `code` (email y contraseña) y el flujo OAuth
 * vuelve con `?error=` en la URL. El texto lo pone quien muestra el aviso.
 */

export interface AuthError {
  code?: string;
  status?: number;
  message?: string;
}

export type AuthErrorKey = keyof Messages["auth"]["errors"];
export type OAuthErrorKey = keyof Messages["auth"]["oauthErrors"];

const CODE_KEYS: Record<string, AuthErrorKey> = {
  INVALID_EMAIL_OR_PASSWORD: "invalidEmailOrPassword",
  INVALID_PASSWORD: "invalidPassword",
  INVALID_EMAIL: "invalidEmail",
  USER_ALREADY_EXISTS: "userAlreadyExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userAlreadyExistsUseAnotherEmail",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  PASSWORD_TOO_LONG: "passwordTooLong",
  EMAIL_NOT_VERIFIED: "emailNotVerified",
  PROVIDER_NOT_FOUND: "providerNotFound",
  FAILED_TO_CREATE_USER: "failedToCreateUser",
  LEGAL_CONSENT_REQUIRED: "legalConsentRequired",
  MISSING_RESPONSE: "captchaFailed",
  VERIFICATION_FAILED: "captchaFailed",
};

const OAUTH_KEYS: Record<string, OAuthErrorKey> = {
  access_denied: "accessDenied",
  account_not_linked: "accountNotLinked",
  signup_disabled: "signupRequired",
};

export function authErrorKey(error: AuthError | null | undefined): AuthErrorKey {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (error?.code && CODE_KEYS[error.code]) return CODE_KEYS[error.code];
  if (error?.status === 429) return "tooManyRequests";
  if (!error?.status) return "unreachable";
  return "fallback";
}

/** Key para el `?error=` con el que vuelve un login con Google o GitHub. */
export function oauthErrorKey(code: string): OAuthErrorKey {
  return OAUTH_KEYS[code] ?? "fallback";
}
