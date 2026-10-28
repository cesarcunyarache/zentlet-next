/*
 * Red de seguridad para lo que sale hacia Sentry: la búsqueda del feed
 * (`?q=…`) es texto libre del usuario sobre sus gastos y aparece en URLs de
 * spans, breadcrumbs y eventos. Se sustituye su valor antes de enviar.
 */

const SEARCH_PARAM = /([?&]q=)[^&#\s"]*/g;
const PRISMA_INVOCATION = "invocation:";

/**
 * Los errores de Prisma copian en el mensaje los argumentos de la query
 * (importes, descripciones…). Se conserva la operación y el motivo, que es
 * lo que sirve para depurar, y se descarta el bloque con los datos.
 */
export function withoutQueryData(error: unknown): unknown {
  if (!(error instanceof Error) || !error.message.includes(PRISMA_INVOCATION)) return error;

  const message = error.message.trim();
  const operation = message.split("\n")[0];
  const reason = message.split("\n\n").pop()?.trim() ?? "";
  const safe = new Error(`${operation} ${reason}`);
  safe.name = error.name;
  safe.stack = error.stack?.replace(error.message, safe.message);
  return safe;
}
const MAX_DEPTH = 8;

export function redactSearchQuery<T>(value: T, depth = 0): T {
  if (typeof value === "string") return value.replace(SEARCH_PARAM, "$1[Filtered]") as T;
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactSearchQuery(item, depth + 1)) as T;
  }
  const entries = Object.entries(value).map(([key, item]) => [key, redactSearchQuery(item, depth + 1)]);
  return Object.fromEntries(entries) as T;
}
