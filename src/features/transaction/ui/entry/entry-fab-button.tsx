"use client";

import { motion, type Transition } from "motion/react";

interface EntryFabButtonProps {
  label: string;
  transition: Transition;
  onClick: () => void;
  children: React.ReactNode;
}

export function EntryFabButton({ label, transition, onClick, children }: EntryFabButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      initial={{ scale: 0, y: 12 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      transition={transition}
      className="bg-app-surface text-app-fg pointer-events-auto grid size-12 place-items-center rounded-full shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--app-ink)_35%,transparent)] ring-1 ring-[var(--app-border)]"
    >
      {children}
    </motion.button>
  );
}
