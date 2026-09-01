import { describe, expect, it } from 'vitest';

import { advanceSphereRotation, rotateSpherePoint } from '@/domain/animation/sphere-rotation';

describe('image sphere movement', () => {
  it('allows vertical rotation beyond the old 70 degree limit', () => {
    expect(advanceSphereRotation({ x: 65, y: 0 }, { x: 20, y: 0 })).toEqual({ x: 85, y: 0 });
  });

  it('normalizes both axes after a complete turn', () => {
    expect(advanceSphereRotation({ x: 175, y: -175 }, { x: 20, y: -20 })).toEqual({ x: -165, y: 165 });
  });

  it('applies horizontal and vertical matrices to the same point', () => {
    const rotated = rotateSpherePoint({ x: 1, y: 0, z: 0 }, { x: 90, y: 90 });
    expect(rotated.x).toBeCloseTo(0, 6);
    expect(rotated.y).toBeCloseTo(1, 6);
    expect(rotated.z).toBeCloseTo(0, 6);
  });
});
