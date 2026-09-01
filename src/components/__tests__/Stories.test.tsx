import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Stories from '@/components/Stories';

const storyMocks = vi.hoisted(() => ({
  loadPublishedStories: vi.fn().mockResolvedValue([]),
  loadStoryViewerState: vi.fn().mockResolvedValue({
    savedStoryIds: new Set<string>(),
    reportedStoryIds: new Set<string>(),
    followedOrganizationIds: new Set<string>(),
  }),
  publishStory: vi.fn().mockResolvedValue('86d0cf8c-2f44-4a7b-839f-3f9af961ea11'),
  reportStory: vi.fn().mockResolvedValue(undefined),
  setStorySaved: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/stories', () => ({
  ...storyMocks,
  storyErrorMessage: () => 'Não foi possível publicar.',
}));

describe('Stories', () => {
  let intersectionCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback; }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    storyMocks.loadPublishedStories.mockResolvedValue([]);
    storyMocks.reportStory.mockClear();
    storyMocks.setStorySaved.mockClear();
    storyMocks.publishStory.mockClear();
  });

  afterEach(() => {
    cleanup();
    intersectionCallback = null;
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.useRealTimers();
  });

  it('uses the new editorial copy and removes the old inline composer, likes and comments', async () => {
    render(<Stories onOpenNGO={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Histórias que aproximam.' })).not.toBeNull();
    expect(screen.getByText('Conheça de perto as pessoas, os momentos e as causas que estão acontecendo por aqui.')).not.toBeNull();
    expect(screen.queryByLabelText('Compartilhar uma história')).toBeNull();

    await waitFor(() => expect(screen.getAllByRole('article', { hidden: true }).length).toBeGreaterThan(8));
    expect(screen.queryByRole('button', { name: 'Curtir história', hidden: true })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Comentar', hidden: true })).toBeNull();
    expect(screen.queryByText('SIMULAÇÃO')).toBeNull();
    expect(screen.queryByText('Momentos e vozes das causas', { exact: true })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Seguindo', hidden: true })).toBeNull();
    expect(screen.getAllByRole('tab', { hidden: true })).toHaveLength(2);
  });

  it('keeps the circular feed preview and loads another demo batch near the end', async () => {
    const { container } = render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(container.querySelectorAll('article').length).toBeGreaterThan(8));
    const initialCount = container.querySelectorAll('article').length;

    expect(container.querySelector('[data-circular-story-gallery]')).not.toBeNull();
    expect(container.querySelector('.scroll-expand--circle')).not.toBeNull();

    await act(async () => {
      intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    await waitFor(() => expect(container.querySelectorAll('article')).toHaveLength(initialCount + 6));
  });

  it('opens the draggable publisher and publishes a real organization story', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} canTellStory />);
    await user.click(screen.getByRole('button', { name: 'Criar nova história' }));
    const composer = screen.getByRole('dialog', { name: 'O que aconteceu por aí?' });
    const input = within(composer).getByRole('textbox', { name: 'Escreva sua história' });
    await user.type(input, 'Hoje abrimos um novo espaço de acolhimento.');
    await user.click(within(composer).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(storyMocks.publishStory).toHaveBeenCalledWith('Hoje abrimos um novo espaço de acolhimento.', null));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'O que aconteceu por aí?' })).toBeNull());
  });

  it('renders sharing in a viewport portal and restores the button two seconds after copy', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByRole('article', { hidden: true }).length).toBeGreaterThan(0));

    fireEvent.click(within(screen.getAllByRole('article', { hidden: true })[0]).getByRole('button', { name: 'Compartilhar', hidden: true }));
    const shareMenu = await screen.findByRole('menu', { name: 'Compartilhar história por', hidden: true });
    expect(shareMenu.className).toContain('fixed');
    await user.click(within(shareMenu).getByRole('menuitem', { name: /Instagram/i, hidden: true }));
    await waitFor(() => expect(screen.getByText('Compartilhamento preparado')).not.toBeNull());
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 2100)); });
    expect(screen.queryByText('Compartilhamento preparado')).toBeNull();
    expect(within(screen.getAllByRole('article', { hidden: true })[0]).getByRole('button', { name: 'Compartilhar', hidden: true })).not.toBeNull();
  });

  it('allows a signed-in donor to publish a story too', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} canTellStory />);
    await user.click(screen.getByRole('button', { name: 'Criar nova história' }));
    const composer = screen.getByRole('dialog', { name: 'O que aconteceu por aí?' });
    await user.type(within(composer).getByRole('textbox', { name: 'Escreva sua história' }), 'Quero compartilhar este momento com a comunidade.');
    await user.click(within(composer).getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(storyMocks.publishStory).toHaveBeenCalledWith('Quero compartilhar este momento com a comunidade.', null));
  });

  it('identifies a founder organization beside its name', async () => {
    storyMocks.loadPublishedStories.mockResolvedValueOnce([{
      id: '86d0cf8c-2f44-4a7b-839f-3f9af961ea11',
      url: '/images/founder-story.webp',
      type: 'image',
      caption: 'Um novo capítulo.',
      timestamp: Date.now(),
      ngoId: 'f43f4e5d-dc3a-44c1-a339-385180556040',
      ngoName: 'TranquiliCare',
      ngoImage: '/images/tranquilicare-heart-transparent.png',
      isFounder: true,
      persisted: true,
    }]);
    render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByTitle('ONG fundadora', { exact: true }).length).toBeGreaterThan(0));
  });

  it('saves stories and offers a report reason from the three-dot menu', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} canTellStory />);
    await waitFor(() => expect(screen.getAllByRole('article', { hidden: true }).length).toBeGreaterThan(0));
    const firstStory = screen.getAllByRole('article', { hidden: true })[0];
    const firstStoryId = firstStory.id;

    fireEvent.click(within(firstStory).getByRole('button', { name: 'Salvar história', hidden: true }));
    expect(within(firstStory).getByRole('button', { name: 'Remover dos salvos', hidden: true })).not.toBeNull();

    fireEvent.click(within(firstStory).getByRole('button', { name: 'Mais opções', hidden: true }));
    await user.click(screen.getByRole('menuitem', { name: 'Denunciar' }));
    const reason = await screen.findByRole('textbox', { name: 'Conte o motivo da denúncia' });
    await user.type(reason, 'Este conteúdo parece inadequado.');
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }));

    await waitFor(() => expect(document.getElementById(firstStoryId)).toBeNull());
    expect(storyMocks.reportStory).toHaveBeenCalledOnce();
  });

  it('keeps the window as the only vertical scroller for the expanded feed', async () => {
    const { container } = render(<Stories onOpenNGO={vi.fn()} />);
    const scrollExpand = container.querySelector('.scroll-expand');
    const feed = container.querySelector('.scroll-expand__overlay')?.firstElementChild;
    expect(scrollExpand?.classList.contains('scroll-expand--window')).toBe(true);
    expect(feed?.classList.contains('overflow-y-auto')).toBe(false);
    expect(feed?.classList.contains('overflow-y-hidden')).toBe(true);
  });
});
