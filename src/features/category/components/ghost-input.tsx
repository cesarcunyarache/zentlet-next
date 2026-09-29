"use client";

import { cn } from "@heroui/react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";

function keyedChars(value: string) {
  const seen = new Map<string, number>();
  return value.split("").map((char) => {
    const count = seen.get(char) ?? 0;
    seen.set(char, count + 1);
    return { id: `${char}-${count}`, char };
  });
}

const CHAR_TRANSITION = { duration: 0.18, ease: EASE_OUT } as const;

export function GhostInput({
  id,
  value,
  placeholder,
  inputSize,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  inputSize: string;
  onChange: (value: string) => void;
}) {
  const displayValue = value || placeholder || "";
  const chars = keyedChars(displayValue);

  return (
    <div className="flex min-w-0 items-center overflow-hidden">
      <div className="relative min-w-0 shrink">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          className={cn(
            "bg-transparent font-semibold tracking-normal text-transparent outline-none",
            "caret-foreground transition-[font-size] duration-200 placeholder:text-transparent selection:bg-foreground/10 disabled:cursor-not-allowed",
            inputSize,
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex min-w-0 items-center justify-start overflow-hidden font-semibold leading-none tracking-normal text-foreground transition-[font-size] duration-200",
            !value && "text-app-muted/40",
            inputSize,
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {chars.map(({ id: charId, char }) => (
              <motion.span
                key={charId}
                layout="position"
                initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -14, filter: "blur(10px)" }}
                transition={CHAR_TRANSITION}
                className="inline-block text-center will-change-[transform,opacity,filter]"
              >
                {char}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
