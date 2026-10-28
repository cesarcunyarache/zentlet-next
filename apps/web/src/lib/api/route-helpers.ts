import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import { reportError } from "@/lib/observability/server";
import { rateLimit } from "@/lib/rate-limit";

/** Cuerpo máximo de una escritura: un movimiento o una categoría ocupan < 1 KB. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Escrituras por usuario y minuto. Holgado para vaciar una cola offline
 * larga (el cliente reintenta los 429 con espera), estrecho para un script.
 */
const WRITES_PER_MINUTE = 120;

/*
 * Piezas comunes de los Route Handlers: sesión, respuestas de error y
 * validación del cuerpo. Todas las respuestas de error llevan `message`,
 * que es lo que lee `getApiErrorMessage` en el cliente.
 */

/** Usuario de cada petición, para que `internalError` lo adjunte sin pasarlo a mano. */
const requestUsers = new WeakMap<Request, string>();

export async function getSessionUserId(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user.id ?? null;
  if (userId) requestUsers.set(req, userId);
  return userId;
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export const unauthorized = () => errorResponse("Unauthorized", 401);

export type ErrorTable<Code extends string> = Record<Code, readonly [message: string, status: number]>;

/** Traduce el código de error de un caso de uso a su respuesta HTTP. */
export function errorFrom<Code extends string>(table: ErrorTable<Code>, code: Code) {
  const [message, status] = table[code];
  return errorResponse(message, status);
}

export function tooManyRequests(message: string, retryAfterSeconds: number) {
  const response = errorResponse(message, 429);
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

/** `Authorization: Bearer <secreto>` en tiempo constante; sin secreto configurado, nadie pasa. */
export function hasBearerSecret(req: Request, secret: string | undefined) {
  const given = req.headers.get("authorization");
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 429 si el usuario superó su cupo de escrituras; `null` si puede seguir. */
export async function writeLimit(userId: string) {
  const { allowed } = await rateLimit(`writes:${userId}`, WRITES_PER_MINUTE, 60_000);
  if (allowed) return null;
  return tooManyRequests("Too many requests", 60);
}

/**
 * 500 para el cliente; el error real queda registrado (log + Sentry si está
 * activo) con el usuario y el id de la petición en Vercel para cruzarlo.
 */
export function internalError(req: Request, error: unknown, message: string) {
  reportError(error, message, {
    userId: requestUsers.get(req),
    requestId: req.headers.get("x-vercel-id") ?? undefined,
    method: req.method,
    path: new URL(req.url).pathname,
  });
  return errorResponse(message, 500);
}

/**
 * Lee y valida el JSON del cuerpo. Devuelve los datos o una respuesta 422
 * con el primer error (un cuerpo que no es JSON también es un 422). Un
 * cuerpo de más de 16 KB es un 413 y ni se interpreta.
 */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  const tooLarge = () => ({ error: errorResponse("Request body too large", 413) });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return tooLarge();

  let body: unknown;
  try {
    const text = await req.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) return tooLarge();
    body = JSON.parse(text);
  } catch {
    return { error: errorResponse("Invalid JSON body", 422) };
  }

  return validate(body, schema, "Invalid body");
}

/** Valida los parámetros de la URL (`?from=…&limit=…`) con el mismo formato de error. */
export function parseQuery<T extends z.ZodType>(
  req: Request,
  schema: T,
): { data: z.infer<T> } | { error: NextResponse } {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return validate(params, schema, "Invalid query");
}

function validate<T extends z.ZodType>(input: unknown, schema: T, fallback: string) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".");
    return { error: errorResponse(path ? `${path}: ${issue.message}` : fallback, 422) };
  }
  return { data: result.data as z.infer<T> };
}
