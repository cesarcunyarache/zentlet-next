"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";

export interface CarouselItem {
  color: string;
  icon: string;
}

interface GestureCarouselProps {
  items: CarouselItem[];
  value?: CarouselItem;
  onChange?: (item: CarouselItem) => void;
  onTap?: () => void;
  onLongPress?: () => void;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

const SWIPE_CONFIDENCE_THRESHOLD = 10000;
const LONG_PRESS_MS = 500;

const swipePower = (offset: number, velocity: number) =>
  Math.abs(offset) * velocity;

export function GestureCarousel({
  items,
  value,
  onChange,
  onTap,
  onLongPress,
}: GestureCarouselProps) {
  const [direction, setDirection] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressFired = useRef(false);

  useEffect(() => () => clearTimeout(longPressTimer.current), []);

  const startLongPress = () => {
    longPressFired.current = false;
    if (!onLongPress) return;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleTap = () => {
    cancelLongPress();
    if (!longPressFired.current) onTap?.();
  };

  const currentIndex = Math.max(
    items.findIndex((item) => item.icon === value?.icon),
    0,
  );

  const currentItem = items[currentIndex];

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    const next = (currentIndex + newDirection + items.length) % items.length;
    onChange?.(items[next]);
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const swipe = swipePower(info.offset.x, info.velocity.x);

    if (swipe < -SWIPE_CONFIDENCE_THRESHOLD) {
      paginate(1);
    } else if (swipe > SWIPE_CONFIDENCE_THRESHOLD) {
      paginate(-1);
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl"
      style={{
        backgroundColor: currentItem.color,
      }}
    >
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={currentItem.icon}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: {
              type: "spring",
              stiffness: 300,
              damping: 30,
            },
            opacity: {
              duration: 0.2,
            },
          }}
          drag="x"
          dragElastic={1}
          dragConstraints={{ left: 0, right: 0 }}
          onDragStart={cancelLongPress}
          onDragEnd={handleDragEnd}
          onTapStart={startLongPress}
          onTap={handleTap}
          onTapCancel={cancelLongPress}
          onContextMenu={(event) => event.preventDefault()}
          className="absolute inset-0 flex cursor-grab touch-pan-y items-center justify-center select-none [-webkit-touch-callout:none] active:cursor-grabbing"
        >
          <div
            className="flex h-full w-full items-center justify-center p-8"
            style={{
              backgroundColor: currentItem.color,
            }}
          >
            <div className="text-5xl">{currentItem.icon}</div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1">
        {items.map((item, index) => (
          <motion.button
            key={item.icon}
            type="button"
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              onChange?.(item);
            }}
            className={`rounded-full transition-all ${
              index === currentIndex
                ? "h-1.5 w-3 bg-white"
                : "h-1.5 w-1.5 bg-white/40"
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
          />
        ))}
      </div>
    </div>
  );
}
