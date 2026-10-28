import { getApiErrorStatus } from "@/core/services/api-error";

export type ListErrorKey = "currencyMismatch" | "forbidden" | "inviteInvalid" | "emailFailed" | "tooMany" | "generic";

const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;
const HTTP_GONE = 410;
const HTTP_TOO_MANY = 429;
const HTTP_BAD_GATEWAY = 502;

export function listErrorKey(error: unknown): ListErrorKey {
  const status = getApiErrorStatus(error);
  if (status === HTTP_CONFLICT) return "currencyMismatch";
  if (status === HTTP_FORBIDDEN) return "forbidden";
  if (status === HTTP_GONE) return "inviteInvalid";
  if (status === HTTP_TOO_MANY) return "tooMany";
  if (status === HTTP_BAD_GATEWAY) return "emailFailed";
  return "generic";
}
