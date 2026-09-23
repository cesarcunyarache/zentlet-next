"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { ScrollProgress } from "@/core/components/ui/scroll-progress";
import { EASE_OUT } from "@/lib/ease";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content";
import { sectionHref } from "../lib/format";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-2xl font-bold tracking-[-0.03em]", className)}>
      Zentlet<span className="text-app-expense">.</span>
    </span>
  );
}

export function SiteHeader({ nav }: { nav: LandingContent["nav"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 24));

  // Escape cierra el menú móvil
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <ScrollProgress className="from-app-expense via-[oklch(0.82_0.14_85)] to-app-income h-0.5" />

      <div
        className={cn(
          "mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full px-4 py-2 transition-[background-color,box-shadow,margin] duration-300 sm:px-5",
          scrolled || open
            ? "bg-app-surface/80 mx-3 shadow-[0_8px_30px_-12px_color-mix(in_oklch,var(--app-fg)_25%,transparent)] ring-1 ring-[var(--app-border)] backdrop-blur-xl sm:mx-auto"
            : "bg-transparent",
        )}
      >
        <Link href={siteConfig.routes.home} aria-label={nav.home} className="rounded-lg">
          <Logo className="text-xl" />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {nav.links.map((link) => (
              <li key={link.section}>
                <a
                  href={sectionHref(link.section)}
                  className="text-app-muted hover:text-app-fg hover:bg-app-fill rounded-full px-3.5 py-2 text-sm font-medium transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={siteConfig.routes.signIn}
            className="text-app-fg hover:bg-app-fill hidden rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:inline-flex"
          >
            {nav.signIn}
          </Link>
          <Link
            href={siteConfig.routes.signUp}
            className="bg-app-fg text-app-bg inline-flex rounded-full px-4 py-2 text-sm font-semibold shadow-[0_10px_20px_-10px_color-mix(in_oklch,var(--app-fg)_70%,transparent)] transition-transform hover:-translate-y-0.5"
          >
            {nav.cta}
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? nav.closeMenu : nav.openMenu}
            onClick={() => setOpen((value) => !value)}
            className="text-app-fg hover:bg-app-fill grid size-10 place-items-center rounded-full md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="menu-movil"
            aria-label="Principal"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="bg-app-surface/95 mx-3 mt-2 rounded-3xl p-3 shadow-[0_20px_40px_-20px_color-mix(in_oklch,var(--app-fg)_40%,transparent)] ring-1 ring-[var(--app-border)] backdrop-blur-xl md:hidden"
          >
            <ul className="m-0 flex list-none flex-col p-0">
              {nav.links.map((link) => (
                <li key={link.section}>
                  <a
                    href={sectionHref(link.section)}
                    onClick={() => setOpen(false)}
                    className="text-app-fg hover:bg-app-fill block rounded-2xl px-4 py-3 text-base font-semibold"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href={siteConfig.routes.signIn}
                  className="text-app-muted hover:bg-app-fill block rounded-2xl px-4 py-3 text-base font-semibold"
                >
                  {nav.signIn}
                </Link>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
