/*
 * Errores de la base de datos que el negocio distingue (p. ej. para
 * responder 409 en vez de 500). Sin dependencias de HTTP: los usan tanto
 * los servicios como los Route Handlers.
 */

function hasPrismaErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === code;
}

/** Violación de clave única de Prisma (p. ej. un id que ya existe). */
export function isUniqueViolation(error: unknown) {
  return hasPrismaErrorCode(error, "P2002");
}

/** Violación de clave foránea de Prisma (p. ej. borrar una categoría en uso). */
export function isForeignKeyViolation(error: unknown) {
  return hasPrismaErrorCode(error, "P2003");
}
