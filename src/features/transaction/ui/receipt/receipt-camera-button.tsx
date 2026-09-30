"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { ScanLine } from "lucide-react";
import { SPRING_PRESS } from "@/lib/ease";

const BUTTON_TRANSITION = { ...SPRING_PRESS, delay: 0.12 };

interface ReceiptCameraButtonProps {
  label: string;
  onPick: (file: File | undefined) => void;
}

export function ReceiptCameraButton({ label, onPick }: ReceiptCameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <motion.button
        type="button"
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        initial={{ scale: 0, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.9 }}
        transition={BUTTON_TRANSITION}
        className="bg-app-surface text-app-fg pointer-events-auto grid size-12 place-items-center rounded-full shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--app-ink)_35%,transparent)] ring-1 ring-[var(--app-border)]"
      >
        <ScanLine className="size-5" strokeWidth={2} />
      </motion.button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </>
  );
}
