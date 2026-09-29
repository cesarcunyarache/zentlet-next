"use client";

import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { DEMO_FIELD_CLASS, STATIC_TEXT_CLASS } from "./tokens";

interface DemoTypingFieldProps {
  staticText: string;
  className?: string;
  children: React.ReactNode;
}

export function DemoTypingField({ staticText, className, children }: DemoTypingFieldProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn(DEMO_FIELD_CLASS, className)}>
      {reduceMotion ? <span className={STATIC_TEXT_CLASS}>{staticText}</span> : children}
    </div>
  );
}
