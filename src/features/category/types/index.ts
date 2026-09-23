/**
 * Forma de una categoría tal y como la devuelve la API (JSON: las fechas
 * viajan como string ISO, no como `Date`).
 */
export interface TCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;

  userId: string;

  createdAt: string;
  updatedAt: string;
}

/** Campos que el cliente puede enviar al crear o actualizar. */
export type TCategoryPayload = Pick<TCategory, "name" | "icon" | "color"> & {
  description?: string;
};
