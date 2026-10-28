"use client";

import { motion } from "motion/react";
import { SPRING_PRESS } from "@/lib/ease";

interface IconButtonProps {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}

export function IconButton({ label, onClick, pressed, children }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={SPRING_PRESS}
      className="text-app-muted hover:bg-app-fill hover:text-app-fg aria-pressed:bg-app-fill aria-pressed:text-app-fg grid size-11 place-items-center rounded-full transition-colors"
    >
      {children}
    </motion.button>
  );
}
