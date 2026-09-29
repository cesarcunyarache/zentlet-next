import { EASE_OUT } from "@/lib/ease";

const SPRINKLE_COUNT = 8;
const SPRINKLE_DISTANCE_PX = 26;

export const FULL_VIEW_MOTION = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.24, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.16, ease: EASE_OUT } },
};

export const REDUCED_VIEW_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } },
};

export const SEND_LABEL_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.16, ease: EASE_OUT },
};

export const SPRINKLES = Array.from({ length: SPRINKLE_COUNT }, (_, index) => {
  const angle = (index / SPRINKLE_COUNT) * Math.PI * 2;
  return {
    x: Math.cos(angle) * SPRINKLE_DISTANCE_PX,
    y: Math.sin(angle) * SPRINKLE_DISTANCE_PX,
    color: index % 2 === 0 ? "var(--app-income)" : "var(--app-fg)",
  };
});
