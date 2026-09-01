export interface ProcessedLogo {
  blob: Blob;
  contentType: 'image/png';
  width: number;
  height: number;
}

/** Provider-neutral boundary. A future remote remover can implement this same contract. */
export interface LogoProcessor {
  processLogo(file: File): Promise<ProcessedLogo>;
  removeBackground(file: File): Promise<ProcessedLogo>;
}

type Rgb = { r: number; g: number; b: number };

const colorDistance = (pixels: Uint8ClampedArray, index: number, background: Rgb) => {
  const red = pixels[index] - background.r;
  const green = pixels[index + 1] - background.g;
  const blue = pixels[index + 2] - background.b;
  return Math.sqrt(red * red + green * green + blue * blue);
};

const estimateEdgeBackground = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Rgb | null => {
  const cornerPixels = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height * width) - 1) * 4,
  ].filter((index) => pixels[index + 3] > 0);
  if (cornerPixels.length === 0) return null;

  const seed = cornerPixels[0];
  const similarCorners = cornerPixels.filter((index) => {
    const red = pixels[index] - pixels[seed];
    const green = pixels[index + 1] - pixels[seed + 1];
    const blue = pixels[index + 2] - pixels[seed + 2];
    return Math.sqrt(red * red + green * green + blue * blue) <= 48;
  });

  return similarCorners.reduce<Rgb>((color, index) => ({
    r: color.r + pixels[index] / similarCorners.length,
    g: color.g + pixels[index + 1] / similarCorners.length,
    b: color.b + pixels[index + 2] / similarCorners.length,
  }), { r: 0, g: 0, b: 0 });
};

/**
 * Removes only pixels connected to an image edge. This avoids erasing white
 * details enclosed inside a logo while handling screenshots and solid margins.
 */
export const removeEdgeBackgroundPixels = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 48,
): Uint8ClampedArray => {
  const result = new Uint8ClampedArray(source);
  if (width <= 0 || height <= 0 || source.length !== width * height * 4) return result;

  const background = estimateEdgeBackground(source, width, height);
  if (!background) return result;

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const enqueue = (pixel: number) => {
    if (pixel < 0 || pixel >= width * height || visited[pixel]) return;
    visited[pixel] = 1;
    const rgbaIndex = pixel * 4;
    if (source[rgbaIndex + 3] === 0 || colorDistance(source, rgbaIndex, background) <= tolerance) {
      queue.push(pixel);
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pixel = queue[cursor];
    result[pixel * 4 + 3] = 0;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y < height - 1) enqueue(pixel + width);
  }

  return result;
};
