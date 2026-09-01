import { describe, expect, it } from 'vitest';

import { chooseSparkColor } from '@/components/ui/click-spark-color';

const COLORS = ['#38b6ff', '#ffd957', '#ffffff'];

describe('chooseSparkColor', () => {
  it.each([
    ['rgb(56, 182, 255)', '#ffd957'],
    ['rgb(255, 217, 87)', '#38b6ff'],
    ['rgb(6, 54, 83)', '#ffffff'],
    ['rgb(255, 255, 255)', '#38b6ff'],
  ])('uses one visible brand color over %s', (background, expected) => {
    const target = document.createElement('button');
    target.style.backgroundColor = background;
    document.body.append(target);

    expect(chooseSparkColor(target, COLORS)).toBe(expected);

    target.remove();
  });
});
