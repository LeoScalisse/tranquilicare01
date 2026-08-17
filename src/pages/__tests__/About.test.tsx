import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import About from '@/pages/About';

describe('About video', () => {
  afterEach(cleanup);

  it('opens the supplied YouTube video in an accessible popover', async () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Assistir ao vídeo: A história por trás do TranquiliCare' }));

    const dialog = screen.getByRole('dialog', { name: 'A história por trás do TranquiliCare' });
    const iframe = dialog.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toContain('youtube.com/embed/G9V69J7cQtY');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'A história por trás do TranquiliCare' })).toBeNull();
    });
  });
});
