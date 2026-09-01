import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartStyle } from '@/components/ui/chart';

describe('ChartStyle', () => {
  it('renders dynamic CSS as escaped text instead of injectable HTML', () => {
    const { container } = render(
      <ChartStyle
        id='safe-chart'
        config={{
          unsafe: { color: 'red;</style><img data-testid="injected" src=x>' },
        }}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('style')?.textContent).not.toContain('</style><img');
    expect(container.querySelector('style')?.textContent).not.toContain('--color-unsafe');
  });
});
