import prisma from "@/lib/prisma";
import { getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

/**
 * Marca el recorrido de bienvenida como visto (terminado u omitido) para
 * que no vuelva a aparecer en ningún dispositivo. Idempotente: repetirlo
 * conserva la primera fecha.
 */
export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    await prisma.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: new Date() },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return internalError(req, error, "Error completing onboarding");
  }
}
