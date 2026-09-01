import type { LogoProcessor, ProcessedLogo } from '@/domain/media/logo-processor';
import { removeEdgeBackgroundPixels } from '@/domain/media/logo-processor';

const MAX_LOGO_EDGE = 1400;

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };
  image.src = objectUrl;
});

const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('image-encoding-failed'));
  }, 'image/png');
});

const alphaBounds = (pixels: Uint8ClampedArray, width: number, height: number) => {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] <= 12) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return { left: 0, top: 0, width, height };
  const padding = Math.round(Math.max(right - left, bottom - top) * 0.055);
  const paddedLeft = Math.max(0, left - padding);
  const paddedTop = Math.max(0, top - padding);
  const paddedRight = Math.min(width - 1, right + padding);
  const paddedBottom = Math.min(height - 1, bottom + padding);
  return {
    left: paddedLeft,
    top: paddedTop,
    width: paddedRight - paddedLeft + 1,
    height: paddedBottom - paddedTop + 1,
  };
};

/**
 * Browser implementation for the MVP. It removes a solid edge-connected
 * background locally, so no organization image is sent to a third party.
 */
export class CanvasLogoProcessor implements LogoProcessor {
  async processLogo(file: File): Promise<ProcessedLogo> {
    return this.removeBackground(file);
  }

  async removeBackground(file: File): Promise<ProcessedLogo> {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_LOGO_EDGE / image.naturalWidth, MAX_LOGO_EDGE / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) throw new Error('canvas-unavailable');
    sourceContext.imageSmoothingEnabled = true;
    sourceContext.imageSmoothingQuality = 'high';
    sourceContext.drawImage(image, 0, 0, width, height);

    const imageData = sourceContext.getImageData(0, 0, width, height);
    const transparentPixels = removeEdgeBackgroundPixels(imageData.data, width, height);
    imageData.data.set(transparentPixels);
    sourceContext.putImageData(imageData, 0, 0);

    const bounds = alphaBounds(transparentPixels, width, height);
    const output = document.createElement('canvas');
    output.width = bounds.width;
    output.height = bounds.height;
    const outputContext = output.getContext('2d');
    if (!outputContext) throw new Error('canvas-unavailable');
    outputContext.drawImage(
      source,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );

    return {
      blob: await canvasToPng(output),
      contentType: 'image/png',
      width: output.width,
      height: output.height,
    };
  }
}
