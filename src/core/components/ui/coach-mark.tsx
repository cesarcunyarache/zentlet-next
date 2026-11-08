"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";

const POLL_MS = 400;
const SPOTLIGHT_PADDING = 6;
const SPOTLIGHT_RADIUS = 28;
const POPOVER_WIDTH = 280;
const POPOVER_GAP = 14;
const POPOVER_HEIGHT_ESTIMATE = 150;
const VIEWPORT_MARGIN = 16;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CoachMarkProps {
  isOpen: boolean;
  target: string;
  title: string;
  body: string;
  dismissLabel: string;
  onDismiss: () => void;
}

function measure(target: string): Box | null {
  const element = document.querySelector(target);
  if (!element) return null;
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top: Math.round(top), left: Math.round(left), width: Math.round(width), height: Math.round(height) };
}

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

function popoverPosition(box: Box) {
  const fitsBelow = box.top + box.height + POPOVER_GAP + POPOVER_HEIGHT_ESTIMATE < window.innerHeight;
  const centered = box.left + box.width / 2 - POPOVER_WIDTH / 2;
  const maxLeft = window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN;
  return {
    left: Math.max(VIEWPORT_MARGIN, Math.min(centered, maxLeft)),
    ...(fitsBelow
      ? { top: box.top + box.height + SPOTLIGHT_PADDING + POPOVER_GAP }
      : { bottom: window.innerHeight - box.top + SPOTLIGHT_PADDING + POPOVER_GAP }),
  };
}

export function CoachMark({ isOpen, target, title, body, dismissLabel, onDismiss }: CoachMarkProps) {
  const shouldReduceMotion = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const update = () => setBox((current) => {
      const next = measure(target);
      return sameBox(current, next) ? current : next;
    });
    const first = setTimeout(update, 0);
    const poll = setInterval(update, POLL_MS);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, target]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onDismiss();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen || !box) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
        className="fixed"
        style={{
          top: box.top - SPOTLIGHT_PADDING,
          left: box.left - SPOTLIGHT_PADDING,
          width: box.width + SPOTLIGHT_PADDING * 2,
          height: box.height + SPOTLIGHT_PADDING * 2,
          borderRadius: SPOTLIGHT_RADIUS,
          boxShadow: "0 0 0 100vmax rgb(0 0 0 / 0.45)",
        }}
      />
      <motion.div
        role="dialog"
        aria-label={title}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: shouldReduceMotion ? 0 : 0.15 }}
        className="bg-app-surface text-app-fg pointer-events-auto fixed rounded-2xl p-4 shadow-[0_8px_30px_rgb(0_0_0/0.18)]"
        style={{ width: POPOVER_WIDTH, ...popoverPosition(box) }}
      >
        <p className="m-0 text-[15px] font-semibold">{title}</p>
        <p className="text-app-muted m-0 mt-1 text-sm leading-relaxed">{body}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="bg-app-fg text-app-surface mt-3 min-h-9 rounded-full px-4 text-sm font-semibold"
        >
          {dismissLabel}
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
