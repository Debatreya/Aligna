/**
 * Converts a canvas to a data URL
 */
export function canvasToDataURL(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.8): string {
  return canvas.toDataURL(type, quality);
}

/**
 * Downloads a canvas as an image file
 */
export function downloadCanvas(canvas: HTMLCanvasElement, filename = 'document.jpg', type = 'image/jpeg', quality = 0.8): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvasToDataURL(canvas, type, quality);
  link.click();
}

/**
 * Creates a new canvas with the same dimensions and content as the original
 */
export function cloneCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  const ctx = newCanvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.drawImage(canvas, 0, 0);
  }
  return newCanvas;
}

/**
 * Creates a canvas from an image URL
 */
export async function imageUrlToCanvas(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
} 