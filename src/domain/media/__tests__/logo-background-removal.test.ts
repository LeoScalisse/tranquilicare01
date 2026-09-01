import { describe, expect, it } from 'vitest';

import { removeEdgeBackgroundPixels } from '@/domain/media/logo-processor';

describe('removeEdgeBackgroundPixels', () => {
  it('makes a light edge-connected background transparent without erasing the logo', () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 20, 40, 80, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);

    const result = removeEdgeBackgroundPixels(pixels, 3, 3);

    expect(result[3]).toBe(0);
    expect(result[19]).toBe(255);
    expect([...result.slice(16, 19)]).toEqual([20, 40, 80]);
  });

  it('preserves an already transparent image', () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 0]);
    expect([...removeEdgeBackgroundPixels(pixels, 1, 1)]).toEqual([10, 20, 30, 0]);
  });
});
