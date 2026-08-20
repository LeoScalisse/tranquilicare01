import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Stories from '@/components/Stories';

describe('Stories infinite feed', () => {
  let intersectionCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }

      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = '';
      thresholds = [];
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  afterEach(() => {
    intersectionCallback = null;
    vi.stubGlobal('IntersectionObserver', undefined);
  });

  it('appends another simulated batch when the end approaches', async () => {
    const { container } = render(
      <Stories onOpenNGO={vi.fn()} />,
    );

    const initialCount = container.querySelectorAll('article').length;
    expect(initialCount).toBeGreaterThan(12);

    await act(async () => {
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(container.querySelectorAll('article')).toHaveLength(initialCount + 6);
    });
  });

  it('uses the same feed instance for preview and expansion, with the brand heart when liked', () => {
    const { container } = render(
      <Stories onOpenNGO={vi.fn()} />,
    );

    const liveFeed = container.querySelector('.scroll-expand__overlay');

    expect(container.querySelector('.scroll-expand__preview')).toBeNull();
    expect(container.querySelector('.scroll-expand--content-preview')).not.toBeNull();
    expect(liveFeed).not.toBeNull();
    expect(liveFeed?.querySelectorAll('article').length).toBeGreaterThan(12);

    const likeButton = within(liveFeed as HTMLElement).getAllByRole('button', {
      name: 'Curtir hist\u00f3ria',
      hidden: true,
    })[0];

    fireEvent.click(likeButton);

    expect(likeButton.getAttribute('aria-label')).toBe('Remover curtida');
    expect(likeButton.querySelector('img')?.getAttribute('src')).toBe(
      '/tranquilicare-heart.png',
    );
  });

  it('uses the window as the only vertical scroller for the expanded feed', () => {
    const { container } = render(
      <Stories onOpenNGO={vi.fn()} />,
    );

    const scrollExpand = container.querySelector('.scroll-expand');
    const feed = container.querySelector('.scroll-expand__overlay')?.firstElementChild;

    expect(scrollExpand?.classList.contains('scroll-expand--window')).toBe(true);
    expect(feed?.classList.contains('overflow-y-auto')).toBe(false);
    expect(feed?.classList.contains('overflow-y-hidden')).toBe(true);
  });

  it('morphs the comment action into an input and submits with Enter', async () => {
    const { container } = render(
      <Stories onOpenNGO={vi.fn()} />,
    );

    const firstStory = container.querySelector('article') as HTMLElement;
    const commentButton = within(firstStory).getByRole('button', {
      name: 'Comentar',
      hidden: true,
    });

    expect(commentButton.textContent).toContain('3');
    fireEvent.click(commentButton);

    const commentInput = within(firstStory).getByRole('textbox', {
      name: 'Escreva um comentário',
      hidden: true,
    });
    expect(within(firstStory).getByRole('button', {
      name: 'Enviar comentário',
      hidden: true,
    })).not.toBeNull();

    fireEvent.change(commentInput, {
      target: { value: 'Que trabalho bonito!' },
    });
    fireEvent.keyDown(commentInput, { key: 'Enter' });

    await waitFor(() => {
      const collapsedButton = within(firstStory).getByRole('button', {
        name: 'Comentar',
        hidden: true,
      });
      expect(collapsedButton.textContent).toContain('4');
      expect(within(firstStory).queryByRole('textbox', {
        name: 'Escreva um comentário',
        hidden: true,
      })).toBeNull();
    });

    fireEvent.click(within(firstStory).getByRole('button', {
      name: 'Comentar',
      hidden: true,
    }));
    const reopenedInput = within(firstStory).getByRole('textbox', {
      name: 'Escreva um comentário',
      hidden: true,
    });
    fireEvent.keyDown(reopenedInput, { key: 'Escape' });

    await waitFor(() => {
      expect(within(firstStory).queryByRole('textbox', {
        name: 'Escreva um comentário',
        hidden: true,
      })).toBeNull();
    });
  });

  it('opens the animated sharing options without shifting the story actions', () => {
    const { container } = render(
      <Stories onOpenNGO={vi.fn()} />,
    );

    const firstStory = container.querySelector('article') as HTMLElement;
    fireEvent.click(within(firstStory).getByRole('button', {
      name: 'Compartilhar',
      hidden: true,
    }));

    const shareMenu = within(firstStory).getByRole('menu', {
      name: 'Compartilhar história por',
      hidden: true,
    });
    expect(within(shareMenu).getByRole('menuitem', { name: /WhatsApp/i, hidden: true })).not.toBeNull();
    expect(within(shareMenu).getByRole('menuitem', { name: /Instagram/i, hidden: true })).not.toBeNull();
    expect(within(shareMenu).getByRole('menuitem', { name: /TranquiliCare/i, hidden: true })).not.toBeNull();
  });

  it('opens existing comments with a long press and keeps a short click for writing', async () => {
    vi.useFakeTimers();
    const { container } = render(
      <Stories onOpenNGO={vi.fn()} />,
    );

    const firstStory = container.querySelector('article') as HTMLElement;
    const commentButton = within(firstStory).getByRole('button', {
      name: 'Comentar',
      hidden: true,
    });

    fireEvent.pointerDown(commentButton, { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 });
    await act(async () => {
      vi.advanceTimersByTime(550);
    });

    expect(screen.getByRole('dialog', { name: 'Comentários da história' })).not.toBeNull();
    expect(screen.getByText('Marina Costa')).not.toBeNull();
    expect(within(firstStory).queryByRole('textbox', {
      name: 'Escreva um comentário',
      hidden: true,
    })).toBeNull();

    vi.useRealTimers();
  });

  it('does not show a repost action', () => {
    const { container } = render(
      <Stories onOpenNGO={vi.fn()} />,
    );

    expect(within(container).queryAllByRole('button', {
      name: 'Recompartilhar',
      hidden: true,
    })).toHaveLength(0);
  });
});
