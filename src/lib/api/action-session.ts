import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Usuario de la sesión en una Server Action: el equivalente de `getSessionUserId` en un Route Handler. */
export async function getActionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}
