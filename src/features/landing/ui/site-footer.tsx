import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localeNames, routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import type { LandingContent } from "../content";
import { sectionHref } from "../lib/format";
import { Logo } from "./shared/logo";

const FOOTER_LINK_CLASS = "text-app-muted hover:text-app-fg text-sm transition-colors";
const LEGAL_LINK_CLASS = "hover:text-app-fg transition-colors";

interface SiteFooterProps {
  footer: LandingContent["footer"];
  nav: LandingContent["nav"];
}

export function SiteFooter({ footer, nav }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--app-border)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="text-app-muted m-0 mt-3 max-w-xs">{footer.tagline}</p>
        </div>

        <FooterColumn title={footer.productTitle}>
          {nav.links.map((link) => (
            <li key={link.section}>
              <a href={sectionHref(link.section)} className={FOOTER_LINK_CLASS}>
                {link.label}
              </a>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={footer.accountTitle}>
          <li>
            <Link href={siteConfig.routes.signIn} className={FOOTER_LINK_CLASS}>
              {nav.signIn}
            </Link>
          </li>
          <li>
            <Link href={siteConfig.routes.signUp} className={FOOTER_LINK_CLASS}>
              {nav.cta}
            </Link>
          </li>
        </FooterColumn>

        <FooterColumn title={footer.languageTitle}>
          <LanguageLinks />
        </FooterColumn>
      </div>

      <div className="text-app-muted mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] px-4 py-6 text-xs sm:px-6">
        <p className="m-0">
          © {year} {siteConfig.name}. {footer.rights}
        </p>
        <nav className="flex gap-4">
          <Link href={siteConfig.routes.privacy} className={LEGAL_LINK_CLASS}>
            {footer.privacy}
          </Link>
          <Link href={siteConfig.routes.terms} className={LEGAL_LINK_CLASS}>
            {footer.terms}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="text-app-fg m-0 text-sm font-semibold">{title}</p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">{children}</ul>
    </nav>
  );
}

function LanguageLinks() {
  const currentLocale = useLocale();

  return routing.locales.map((locale) => (
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
  ));
}
