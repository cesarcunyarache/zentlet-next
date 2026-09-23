"use client";

import { cn } from "@heroui/react";

interface ToastBubbleProps {
  message: string | null;
}

/** Aviso breve al pie de la ventana. Se anuncia, no interrumpe. */
export function ToastBubble({ message }: ToastBubbleProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "bg-app-fg text-app-bg pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2",
        "rounded-full px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap shadow-lg",
        "transition-[opacity,transform] duration-200",
        message ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0",
      )}
    >
      {message}
    </div>
  );
}
