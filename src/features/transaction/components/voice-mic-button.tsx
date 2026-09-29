"use client";

import { motion } from "motion/react";
import { Mic } from "lucide-react";
import { SPRING_PRESS } from "@/lib/ease";

const MIC_BUTTON_TRANSITION = { ...SPRING_PRESS, delay: 0.08 };

interface VoiceMicButtonProps {
  label: string;
  onPress: () => void;
}

export function VoiceMicButton({ label, onPress }: VoiceMicButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onPress}
      initial={{ scale: 0, y: 12 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      transition={MIC_BUTTON_TRANSITION}
      className="bg-app-surface text-app-fg pointer-events-auto grid size-12 place-items-center rounded-full shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--app-ink)_35%,transparent)] ring-1 ring-[var(--app-border)]"
    >
      <Mic className="size-5" strokeWidth={2} />
    </motion.button>
  );
}
