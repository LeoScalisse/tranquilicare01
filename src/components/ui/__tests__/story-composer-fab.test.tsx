import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import StoryComposerFab from '@/components/ui/story-composer-fab';

describe('StoryComposerFab', () => {
  afterEach(cleanup);

  it('keeps the close control inside the composer and restores the creation trigger', async () => {
    const user = userEvent.setup();
    render(
      <StoryComposerFab
        visible
        canPublish
        onUnavailable={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Criar nova história' });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'O que aconteceu por aí?' });
    const close = within(dialog).getByRole('button', { name: 'Fechar nova história' });
    expect(dialog.contains(close)).toBe(true);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Criar nova história' })).toBeNull();
    });

    await user.click(close);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'O que aconteceu por aí?' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Criar nova história' })).toBe(document.activeElement);
    });
  });
});
