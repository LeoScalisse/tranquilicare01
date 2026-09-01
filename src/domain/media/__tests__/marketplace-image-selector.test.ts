import { describe, expect, it } from 'vitest';

import { selectMarketplaceImage } from '@/domain/media/marketplace-image-selector';

describe('selectMarketplaceImage', () => {
  it('prefers a sharp landscape image that can fill the marketplace card', () => {
    const selected = selectMarketplaceImage([
      { id: 'portrait', width: 1800, height: 2600, sharpness: 0.82 },
      { id: 'landscape', width: 2000, height: 1300, sharpness: 0.88 },
      { id: 'small', width: 640, height: 480, sharpness: 0.95 },
    ]);

    expect(selected?.id).toBe('landscape');
  });

  it('uses the first valid photo when automatic analysis has no usable dimensions', () => {
    const selected = selectMarketplaceImage([
      { id: 'first', width: 0, height: 0 },
      { id: 'second', width: 0, height: 0 },
    ]);

    expect(selected?.id).toBe('first');
  });

  it('returns null when no photo was supplied', () => {
    expect(selectMarketplaceImage([])).toBeNull();
  });
});
