// Duck-typed on purpose: avoids importing Prisma's runtime error class just to
// read `.code`, matching how the rest of this codebase distinguishes DB errors.
function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === code;
}

export function isUniqueViolation(error: unknown): boolean {
  return hasPrismaErrorCode(error, 'P2002');
}

/** The unique constraint's column names (Prisma's `meta.target` on a P2002), used to tell which unique constraint was violated. */
export function uniqueViolationTarget(error: unknown): string[] | null {
  if (!isUniqueViolation(error)) return null;
  const meta = (error as { meta?: { target?: unknown } }).meta;
  return Array.isArray(meta?.target) ? (meta.target as string[]) : null;
}
