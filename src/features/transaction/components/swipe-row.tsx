"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { SWIPE_ACTION, SWIPE_REVEAL, swipeOffset, swipeSideOnRelease, type SwipeSide } from "../lib/swipe";

const ACTION_FADE_DISTANCE = 16;
const DRAG_ELASTICITY = 0.15;

interface SwipeRowProps {
  editLabel: string;
  deleteLabel: string;
  openSide: SwipeSide | null;
  canEdit: boolean;
  canDelete: boolean;
  onOpenChange: (side: SwipeSide | null) => void;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function SwipeRow({
  editLabel,
  deleteLabel,
  openSide,
  canEdit,
  canDelete,
  onOpenChange,
  onPress,
  onEdit,
  onDelete,
  children,
}: SwipeRowProps) {
  const wasDragged = useRef(false);
  const x = useMotionValue(0);
  const editOpacity = useTransform(x, [0, ACTION_FADE_DISTANCE], [0, 1]);
  const deleteOpacity = useTransform(x, [-ACTION_FADE_DISTANCE, 0], [1, 0]);
  const canSwipe = canEdit || canDelete;

  useEffect(() => {
    const controls = animate(x, swipeOffset(openSide), SPRING_LAYOUT);
    return () => controls.stop();
  }, [openSide, x]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const side = swipeSideOnRelease({ offset: x.get(), velocity: info.velocity.x, canEdit, canDelete });
    animate(x, swipeOffset(side), SPRING_LAYOUT);
    onOpenChange(side);
    setTimeout(() => (wasDragged.current = false), 0);
  }

  function handleClick() {
    if (wasDragged.current) return;
    if (openSide) onOpenChange(null);
    else onPress();
  }

  return (
    <>
      {canEdit ? (
        <motion.button
          type="button"
          aria-label={editLabel}
          tabIndex={openSide === "edit" ? 0 : -1}
          onClick={onEdit}
          className="bg-app-fg text-app-surface absolute inset-y-0 left-0 grid place-items-center rounded-2xl"
          style={{ width: SWIPE_ACTION, opacity: editOpacity }}
        >
          <Pencil className="size-5" strokeWidth={2} aria-hidden />
        </motion.button>
      ) : null}
      {canDelete ? (
        <motion.button
          type="button"
          aria-label={deleteLabel}
          tabIndex={openSide === "delete" ? 0 : -1}
          onClick={onDelete}
          className="bg-app-expense text-app-surface absolute inset-y-0 right-0 grid place-items-center rounded-2xl"
          style={{ width: SWIPE_ACTION, opacity: deleteOpacity }}
        >
          <Trash2 className="size-5" strokeWidth={2} aria-hidden />
        </motion.button>
      ) : null}
      <motion.button
        type="button"
        drag={canSwipe ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: canDelete ? -SWIPE_REVEAL : 0, right: canEdit ? SWIPE_REVEAL : 0 }}
        dragElastic={{ left: canDelete ? DRAG_ELASTICITY : 0, right: canEdit ? DRAG_ELASTICITY : 0 }}
        style={{ x }}
        onDragStart={() => {
          wasDragged.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        className="group bg-app-bg hover:bg-[color-mix(in_oklch,var(--app-fg)_5%,var(--app-bg))] focus-visible:bg-[color-mix(in_oklch,var(--app-fg)_5%,var(--app-bg))] relative flex min-h-[64px] w-full touch-pan-y items-center gap-3.5 rounded-2xl px-3 py-2 text-left transition-colors"
      >
        {children}
      </motion.button>
    </>
  );
}
