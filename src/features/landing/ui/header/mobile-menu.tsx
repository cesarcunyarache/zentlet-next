"use client";

import { Link } from "@/i18n/navigation";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";
import { siteConfig } from "@/lib/site";
import type { LandingContent } from "../../content";
import { sectionHref } from "../../lib/format";

export const MOBILE_MENU_ID = "menu-movil";

const HIDDEN = { opacity: 0, y: -8, scale: 0.98 };
const VISIBLE = { opacity: 1, y: 0, scale: 1 };
const TRANSITION = { duration: 0.25, ease: EASE_OUT };

interface MobileMenuProps {
  isOpen: boolean;
  nav: LandingContent["nav"];
  hasSignInLink: boolean;
  onNavigate: () => void;
}

export function MobileMenu({ isOpen, nav, hasSignInLink, onNavigate }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.nav
          id={MOBILE_MENU_ID}
          aria-label={nav.label}
          initial={HIDDEN}
          animate={VISIBLE}
          exit={HIDDEN}
          transition={TRANSITION}
          className="bg-app-surface/95 mx-3 mt-2 rounded-3xl p-3 shadow-[0_20px_40px_-20px_color-mix(in_oklch,var(--app-fg)_40%,transparent)] ring-1 ring-[var(--app-border)] backdrop-blur-xl md:hidden"
        >
          <ul className="m-0 flex list-none flex-col p-0">
            {nav.links.map((link) => (
              <li key={link.section}>
                <a
                  href={sectionHref(link.section)}
                  onClick={onNavigate}
                  className="text-app-fg hover:bg-app-fill block rounded-2xl px-4 py-3 text-base font-semibold"
                >
                  {link.label}
                </a>
              </li>
            ))}
            {hasSignInLink && (
              <li>
                <Link
                  href={siteConfig.routes.signIn}
                  className="text-app-muted hover:bg-app-fill block rounded-2xl px-4 py-3 text-base font-semibold"
                >
                  {nav.signIn}
                </Link>
              </li>
            )}
          </ul>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
