// Duck-typed on purpose: avoids importing Prisma's runtime error class just to
// read `.code`, matching how the rest of this codebase distinguishes DB errors.
function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === code;
}

export function isUniqueViolation(error: unknown): boolean {
  return hasPrismaErrorCode(error, 'P2002');
}
