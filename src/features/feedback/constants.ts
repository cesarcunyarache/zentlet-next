/*
 * Valores válidos de `feedback.type` y `feedback.status`. En la base de datos
 * son texto libre a propósito: se amplían aquí sin migración.
 */

/** Qué envía el usuario. Hoy la app sólo manda `comment`; el resto es para clasificar después. */
export const FEEDBACK_TYPES = ["comment", "bug", "idea"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/** Seguimiento interno de la revisión: el usuario nunca lo ve. */
export const FEEDBACK_STATUSES = ["open", "reviewed", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** Igual que `@db.VarChar(2000)` en la tabla. */
export const FEEDBACK_MAX_LENGTH = 2000;
