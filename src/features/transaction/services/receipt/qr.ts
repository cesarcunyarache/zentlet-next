export async function decodeQrFromImage(image: Blob): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
}
