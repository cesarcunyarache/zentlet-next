const RECEIPT_MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;

interface Size {
  width: number;
  height: number;
}

export function fitWithin({ width, height }: Size, maxSide = RECEIPT_MAX_SIDE): Size {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))), "image/jpeg", JPEG_QUALITY);
  });
}
