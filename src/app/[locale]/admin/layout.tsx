import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { redirect } from "@/i18n/navigation";
import { OfflineQueryProvider } from "@/core/offline/offline-query-provider";
import { ThemeController } from "@/core/theme/theme-controller";
import { AnalyticsIdentity } from "@/lib/observability/analytics-identity";
import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";
import { OnboardingProvider } from "@/features/onboarding/onboarding-context";
import { PreferenceSync } from "@/features/preference/components/preference-sync";
import { AccountCurrencyProvider } from "@/features/preference/hooks/useCurrency";
import { preferencesSchema } from "@/features/preference/schemas/preference.schema";

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

/**
 * La moneda de la cuenta viaja en el HTML para que la primera pintura ya
 * la muestre. Si la lectura falla, la página abre igual: el dispositivo o
 * la sincronización la ponen después.
 */
async function accountCurrency(userId: string) {
  try {
    const row = await prisma.userPreference.findUnique({ where: { userId }, select: { currency: true } });
    return row && preferencesSchema.shape.currency.parse(row.currency);
  } catch (error) {
    logger.warn({ err: error, userId }, "preferences.currency_load_failed");
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect({ href: siteConfig.routes.signIn, locale: await getLocale() });
  const currency = await accountCurrency(session.user.id);

  return (
    <OfflineQueryProvider
      key={session.user.id}
      userId={session.user.id}
      pageSession={pageSession(new Date(session.session.expiresAt))}
    >
      <ThemeController />
      <AnalyticsIdentity userId={session.user.id} />
      <PreferenceSync />
      <AccountCurrencyProvider currency={currency}>
        <OnboardingProvider userId={session.user.id} pending={!session.user.onboardingCompletedAt}>
          {children}
        </OnboardingProvider>
      </AccountCurrencyProvider>
    </OfflineQueryProvider>
  );
}
