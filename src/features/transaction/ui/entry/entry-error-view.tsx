"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { SPRING_PRESS } from "@/lib/ease";
import { VOICE_VIEW_MOTION } from "../voice/voice-view-motion";

interface EntryErrorViewProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

export function EntryErrorView({ icon: Icon, title, body }: EntryErrorViewProps) {
  return (
    <motion.div {...VOICE_VIEW_MOTION} className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <motion.span
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRING_PRESS}
        className="bg-app-expense-soft text-app-expense grid size-20 place-items-center rounded-full"
      >
        <Icon className="size-8" strokeWidth={2} />
      </motion.span>
      <h3 className="font-display text-app-fg m-0 text-2xl font-bold tracking-[-0.02em]">{title}</h3>
      <p role="alert" className="text-app-muted m-0 max-w-sm text-sm leading-relaxed">
        {body}
      </p>
    </motion.div>
  );
}
