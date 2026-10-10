/*
 * Pantallas de arranque de la app instalada en iOS. Safari no las saca del
 * manifest: sólo muestra la imagen cuyo tamaño coincide exacto con el de la
 * pantalla, y si no hay ninguna, pinta blanco mientras carga.
 *
 * Sin variante oscura: iOS no evalúa prefers-color-scheme en estos media
 * y con él no coincide ninguna imagen.
 *
 * Las imágenes las genera `pnpm splash` en /public/splash.
 */

// el background_color del manifest
export const SPLASH_BACKGROUND = "#f6f4f9";

interface SplashDevice {
  width: number;
  height: number;
  ratio: number;
}

// tamaños en puntos CSS, en vertical
export const SPLASH_DEVICES: SplashDevice[] = [
  { width: 440, height: 956, ratio: 3 },
  { width: 420, height: 912, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  { width: 320, height: 568, ratio: 2 },
  { width: 1032, height: 1376, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
  { width: 834, height: 1210, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1112, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 744, height: 1133, ratio: 2 },
];

export function splashFileName(device: SplashDevice) {
  return `${device.width * device.ratio}x${device.height * device.ratio}.png`;
}

export function splashStartupImages() {
  return SPLASH_DEVICES.map((device) => ({
    url: `/splash/${splashFileName(device)}`,
    media: `(device-width: ${device.width}px) and (device-height: ${device.height}px) and (-webkit-device-pixel-ratio: ${device.ratio}) and (orientation: portrait)`,
  }));
}
