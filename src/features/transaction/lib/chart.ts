/** Alto total del gráfico por categoría y alto mínimo legible de una barra con movimientos. */
export const CHART_HEIGHT = 232;
export const BAR_MIN = 76;
/** Categoría sin movimientos: una píldora baja con "emoji 0". */
export const IDLE_HEIGHT = 44;

/**
 * Alto de la barra de una categoría. Proporcional al importe (con signo o
 * sin él: gasto e ingreso se comparan por magnitud); el mínimo sólo
 * garantiza que quepa el texto, así que un importe mayor nunca queda más
 * bajo que uno menor.
 */
export function barHeight(total: number, max: number) {
  // restos de sumas en coma flotante (0.0000001) cuentan como 0
  const idle = Math.abs(total) < 0.005 || max <= 0;
  if (idle) return { idle: true, height: IDLE_HEIGHT };
  return { idle: false, height: Math.max(BAR_MIN, Math.round((Math.abs(total) / max) * CHART_HEIGHT)) };
}
