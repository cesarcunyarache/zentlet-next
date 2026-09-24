import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { redirect } from "@/i18n/navigation";
import { OfflineQueryProvider } from "@/core/offline/offline-query-provider";
import { ThemeController } from "@/core/theme/theme-controller";
import { AnalyticsIdentity } from "@/lib/observability/analytics-identity";

/**
 * La sesión se lee aquí (servidor) y el id del usuario viaja en el HTML:
 * sin conexión, el service worker sirve esta misma página guardada y la
 * app sabe qué cache local abrir sin preguntar a la red. También viaja lo
 * que le queda a la sesión: pasado ese tiempo, la página guardada ya no
 * abre datos.
 */
function pageSession(expiresAt: Date) {
  const renderedAt = Date.now();
  return { renderedAt, sessionRemainingMs: expiresAt.getTime() - renderedAt };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect({ href: siteConfig.routes.signIn, locale: await getLocale() });

  return (
    <OfflineQueryProvider
      key={session.user.id}
      userId={session.user.id}
      pageSession={pageSession(new Date(session.session.expiresAt))}
    >
      <ThemeController />
      <AnalyticsIdentity userId={session.user.id} />
      {children}
    </OfflineQueryProvider>
  );
}
