function drawOnCanvas(bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context?.drawImage(bitmap, 0, 0);
  return context;
}

export async function decodeQrFromImage(image: Blob): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const bitmap = await createImageBitmap(image);
  const context = drawOnCanvas(bitmap);
  bitmap.close();
  if (!context) return null;
  const { data, width, height } = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  return jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
}
