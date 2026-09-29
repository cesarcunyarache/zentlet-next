"use client";

import { motion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../../content";
import { PREVIEW_FRAME_CLASS } from "./preview-frame";

const HIDDEN = { opacity: 0, x: -16 };
const VISIBLE = { opacity: 1, x: 0 };
const STAGGER_S = 0.12;

export function SignUpPreview({ preview }: { preview: LandingContent["steps"]["preview"] }) {
  return (
    <div aria-hidden className={cn(PREVIEW_FRAME_CLASS, "bg-app-fg text-app-bg")}>
      <div className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-[color-mix(in_oklch,var(--app-expense)_40%,transparent)] blur-3xl" />
      <p className="relative m-0 text-sm font-semibold opacity-70">{preview.signUpLabel}</p>
      <ul className="relative m-0 mt-4 flex list-none flex-col gap-3 p-0">
        {preview.signUpProviders.map((provider, index) => (
          <motion.li
            key={provider}
            initial={HIDDEN}
            animate={VISIBLE}
            transition={{ duration: 0.5, delay: STAGGER_S * index, ease: EASE_OUT }}
            className="bg-app-bg/10 flex h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold ring-1 ring-white/10"
          >
            {provider}
            <span className="text-app-bg/50">→</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
