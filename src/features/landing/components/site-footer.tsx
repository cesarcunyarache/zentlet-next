import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localeNames, routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import type { LandingContent } from "../content";
import { sectionHref } from "../lib/format";
import { Logo } from "./shared/logo";

interface SiteFooterProps {
  footer: LandingContent["footer"];
  nav: LandingContent["nav"];
}

export function SiteFooter({ footer, nav }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const currentLocale = useLocale();

  return (
    <footer className="border-t border-[var(--app-border)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="text-app-muted m-0 mt-3 max-w-xs">{footer.tagline}</p>
        </div>

        <nav aria-label={footer.productTitle}>
          <p className="text-app-fg m-0 text-sm font-semibold">{footer.productTitle}</p>
          <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
            {nav.links.map((link) => (
              <li key={link.section}>
                <a href={sectionHref(link.section)} className="text-app-muted hover:text-app-fg text-sm transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={footer.accountTitle}>
          <p className="text-app-fg m-0 text-sm font-semibold">{footer.accountTitle}</p>
          <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
            <li>
              <Link href={siteConfig.routes.signIn} className="text-app-muted hover:text-app-fg text-sm transition-colors">
                {nav.signIn}
              </Link>
            </li>
            <li>
              <Link href={siteConfig.routes.signUp} className="text-app-muted hover:text-app-fg text-sm transition-colors">
                {nav.cta}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={footer.languageTitle}>
          <p className="text-app-fg m-0 text-sm font-semibold">{footer.languageTitle}</p>
          <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
            {routing.locales.map((locale) => (
              <li key={locale}>
                <Link
                  href={siteConfig.routes.home}
                  locale={locale}
                  hrefLang={locale}
                  aria-current={locale === currentLocale ? "true" : undefined}
                  className="text-app-muted hover:text-app-fg aria-[current]:text-app-fg text-sm transition-colors aria-[current]:font-semibold"
                >
                  {localeNames[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="text-app-muted mx-auto m-0 max-w-6xl border-t border-[var(--app-border)] px-4 py-6 text-xs sm:px-6">
        © {year} {siteConfig.name}. {footer.rights}
      </p>
    </footer>
  );
}
