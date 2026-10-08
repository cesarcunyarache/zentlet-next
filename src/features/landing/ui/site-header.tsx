"use client";

import { useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { ScrollProgress } from "@/core/components/ui/scroll-progress";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useHasSession } from "../hooks/useHasSession";
import { useIsScrolledPast } from "../hooks/useIsScrolledPast";
import { DesktopNav } from "./header/desktop-nav";
import { MOBILE_MENU_ID, MobileMenu } from "./header/mobile-menu";
import { SessionActions } from "./header/session-actions";
import { Logo } from "./shared/logo";

const SCROLL_THRESHOLD_PX = 24;

export function SiteHeader({ nav }: { nav: LandingContent["nav"] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isScrolled = useIsScrolledPast(SCROLL_THRESHOLD_PX);
  const hasSession = useHasSession();
  const isSessionPending = hasSession === null;
  const isElevated = isScrolled || isMenuOpen;

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleMenu = () => setIsMenuOpen((value) => !value);

  useEscapeKey(isMenuOpen, closeMenu);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <ScrollProgress className="from-brand-jade via-brand-jade to-brand-leaf h-0.5" />

      <div
        className={cn(
          "mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full px-4 py-2 transition-[background-color,box-shadow,margin] duration-300 sm:px-5",
          isElevated
            ? "bg-app-surface/80 mx-3 shadow-[0_8px_30px_-12px_color-mix(in_oklch,var(--app-fg)_25%,transparent)] ring-1 ring-[var(--app-border)] backdrop-blur-xl sm:mx-auto"
            : "bg-transparent",
        )}
      >
        <Link href={siteConfig.routes.home} aria-label={nav.home} className="rounded-lg">
          <Logo className="text-xl" />
        </Link>

        <DesktopNav links={nav.links} label={nav.label} />

        <div className={cn("flex items-center gap-2", isSessionPending && "[&>a]:invisible")}>
          <SessionActions hasSession={hasSession} nav={nav} />
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls={MOBILE_MENU_ID}
            aria-label={isMenuOpen ? nav.closeMenu : nav.openMenu}
            onClick={toggleMenu}
            className="text-app-fg hover:bg-app-fill grid size-10 place-items-center rounded-full md:hidden"
          >
            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <MobileMenu isOpen={isMenuOpen} nav={nav} hasSignInLink={hasSession === false} onNavigate={closeMenu} />
    </header>
  );
}
