import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SPLASH_BACKGROUND, SPLASH_DEVICES, splashFileName } from "@/core/pwa/splash-screens";

const ICON = path.join(process.cwd(), "public/icons/icon-512.png");
const OUT_DIR = path.join(process.cwd(), "public/splash");

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  for (const device of SPLASH_DEVICES) {
    const width = device.width * device.ratio;
    const height = device.height * device.ratio;
    // como el icono del escritorio de iOS: ~30 % del ancho en teléfonos
    const iconSize = Math.round(Math.min(width, height) * 0.3);
    const icon = await sharp(ICON).resize(iconSize, iconSize).toBuffer();

    await sharp({ create: { width, height, channels: 4, background: SPLASH_BACKGROUND } })
      .composite([{ input: icon, gravity: "center" }])
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(OUT_DIR, splashFileName(device)));
  }

  console.log(`${SPLASH_DEVICES.length} pantallas en public/splash`);
}

main();
