import { SPRING_SWAP } from "@/lib/ease";

export const VOICE_VIEW_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: SPRING_SWAP,
};
