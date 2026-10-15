import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getActionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user.id ?? null;
}
