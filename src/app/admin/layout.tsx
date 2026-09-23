import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OfflineQueryProvider } from "@/core/offline/offline-query-provider";

/**
 * La sesión se lee aquí (servidor) y el id del usuario viaja en el HTML:
 * sin conexión, el service worker sirve esta misma página guardada y la
 * app sabe qué cache local abrir sin preguntar a la red.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");

  return (
    <OfflineQueryProvider key={session.user.id} userId={session.user.id}>
      {children}
    </OfflineQueryProvider>
  );
}
