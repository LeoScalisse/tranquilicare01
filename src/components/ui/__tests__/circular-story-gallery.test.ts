import { describe, expect, it } from 'vitest';

import { normalizeCircularDragDelta } from '@/lib/circularDrag';

describe('normalizeCircularDragDelta', () => {
  it('keeps the drag direction stable when crossing the -180/180 degree boundary', () => {
    expect(normalizeCircularDragDelta(-358)).toBe(2);
    expect(normalizeCircularDragDelta(358)).toBe(-2);
  });

  it('keeps ordinary angular movement unchanged', () => {
    expect(normalizeCircularDragDelta(24)).toBe(24);
    expect(normalizeCircularDragDelta(-31)).toBe(-31);
  });
});
