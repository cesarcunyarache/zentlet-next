export type DeleteAccountErrorKey = "invalidPassword" | "sessionExpired" | "fallback";

const CREDENTIAL_PROVIDER_ID = "credential";

const ERROR_KEYS_BY_CODE: Record<string, DeleteAccountErrorKey> = {
  INVALID_PASSWORD: "invalidPassword",
  SESSION_EXPIRED: "sessionExpired",
};

export function hasCredentialAccount(accounts: { providerId: string }[] | null | undefined) {
  return Boolean(accounts?.some((account) => account.providerId === CREDENTIAL_PROVIDER_ID));
}

export function deleteAccountErrorKey(code: string | undefined): DeleteAccountErrorKey {
  return ERROR_KEYS_BY_CODE[code ?? ""] ?? "fallback";
}
