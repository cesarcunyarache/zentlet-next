export type SwipeSide = "edit" | "delete";

/** Ancho de los botones que descubre el deslizamiento y aire entre botón y fila. */
export const SWIPE_ACTION = 72;
export const SWIPE_GAP = 10;
export const SWIPE_REVEAL = SWIPE_ACTION + SWIPE_GAP;
/** Por encima de esta velocidad (px/s) basta un gesto rápido para abrir. */
const FLICK_VELOCITY = 400;

/** Desplazamiento de la fila con cada lado abierto: editar a la derecha, eliminar a la izquierda. */
export function swipeOffset(side: SwipeSide | null) {
  return side === "edit" ? SWIPE_REVEAL : side === "delete" ? -SWIPE_REVEAL : 0;
}

/**
 * Qué lado queda abierto al soltar: pasada la mitad del botón, o con un
 * gesto rápido en la misma dirección en que quedó la fila.
 */
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
  const flick = Math.abs(velocity) > FLICK_VELOCITY && Math.sign(velocity) === Math.sign(offset);
  if (canDelete && (offset < -SWIPE_REVEAL / 2 || (flick && offset < 0))) return "delete";
  if (canEdit && (offset > SWIPE_REVEAL / 2 || (flick && offset > 0))) return "edit";
  return null;
}
