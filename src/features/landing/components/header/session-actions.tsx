import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import type { LandingContent } from "../../content";

const PRIMARY_LINK_CLASS =
  "bg-app-fg text-app-bg inline-flex rounded-full px-4 py-2 text-sm font-semibold shadow-[0_10px_20px_-10px_color-mix(in_oklch,var(--app-fg)_70%,transparent)] transition-transform hover:-translate-y-0.5";

interface SessionActionsProps {
  hasSession: boolean | null;
  nav: LandingContent["nav"];
}

export function SessionActions({ hasSession, nav }: SessionActionsProps) {
  if (hasSession) {
    return (
      <Link href={siteConfig.routes.app} className={PRIMARY_LINK_CLASS}>
        {nav.dashboard}
      </Link>
    );
  }

  return (
    <>
      <Link
        href={siteConfig.routes.signIn}
        className="text-app-fg hover:bg-app-fill hidden rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:inline-flex"
      >
        {nav.signIn}
      </Link>
      <Link href={siteConfig.routes.signUp} className={PRIMARY_LINK_CLASS}>
        {nav.cta}
      </Link>
    </>
  );
}
