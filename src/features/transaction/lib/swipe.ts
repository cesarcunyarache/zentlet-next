export type SwipeSide = "edit" | "delete";

export const SWIPE_ACTION = 72;
export const SWIPE_GAP = 10;
export const SWIPE_REVEAL = SWIPE_ACTION + SWIPE_GAP;
const FLICK_VELOCITY = 400;
const OPEN_THRESHOLD = SWIPE_REVEAL / 2;

const OFFSETS: Record<SwipeSide, number> = { edit: SWIPE_REVEAL, delete: -SWIPE_REVEAL };

export function swipeOffset(side: SwipeSide | null) {
  return side ? OFFSETS[side] : 0;
}

export function swipeSideOnRelease({
  offset,
  velocity,
  canEdit,
  canDelete,
}: {
  offset: number;
  velocity: number;
  canEdit: boolean;
  canDelete: boolean;
}): SwipeSide | null {
  const isFlick = Math.abs(velocity) > FLICK_VELOCITY && Math.sign(velocity) === Math.sign(offset);
  if (canDelete && (offset < -OPEN_THRESHOLD || (isFlick && offset < 0))) return "delete";
  if (canEdit && (offset > OPEN_THRESHOLD || (isFlick && offset > 0))) return "edit";
  return null;
}
