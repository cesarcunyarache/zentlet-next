/*
 * Errores de Better Auth en español. El cliente los devuelve con `code`
 * (email y contraseña) y el flujo OAuth vuelve con `?error=` en la URL.
 */

export interface AuthError {
  code?: string;
  status?: number;
  message?: string;
}

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  INVALID_PASSWORD: "Contraseña incorrecta.",
  INVALID_EMAIL: "El correo no es válido.",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo. Inicia sesión o usa otro.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  EMAIL_NOT_VERIFIED: "Tu correo aún no está verificado.",
  PROVIDER_NOT_FOUND: "Ese método de acceso no está disponible.",
  FAILED_TO_CREATE_USER: "No pudimos crear tu cuenta. Inténtalo de nuevo.",
};

const OAUTH_MESSAGES: Record<string, string> = {
  access_denied: "Cancelaste el acceso. Puedes intentarlo de nuevo cuando quieras.",
  account_not_linked: "Ese correo ya tiene una cuenta. Entra con tu correo y contraseña.",
};

const FALLBACK = "No pudimos completar la acción. Inténtalo de nuevo.";

export function authErrorMessage(error: AuthError | null | undefined) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
  }
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error?.status === 429) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  if (!error?.status) return "No pudimos conectar con el servidor. Inténtalo de nuevo.";
  return FALLBACK;
}

/** Mensaje para el `?error=` con el que vuelve un login con Google o GitHub. */
export function oauthErrorMessage(code: string) {
  return OAUTH_MESSAGES[code] ?? "No pudimos iniciar sesión con ese proveedor. Inténtalo de nuevo.";
}
