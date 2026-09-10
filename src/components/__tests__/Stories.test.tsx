import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Stories from '@/components/Stories';

const storyMocks = vi.hoisted(() => ({
  loadPublishedStories: vi.fn().mockResolvedValue([]),
  loadStoryViewerState: vi.fn().mockResolvedValue({
    savedStoryIds: new Set<string>(),
    likedStoryIds: new Set<string>(),
    reportedStoryIds: new Set<string>(),
    followedOrganizationIds: new Set<string>(),
    currentProfileId: null,
  }),
  publishStory: vi.fn().mockResolvedValue('86d0cf8c-2f44-4a7b-839f-3f9af961ea11'),
  reportStory: vi.fn().mockResolvedValue(undefined),
  setStorySaved: vi.fn().mockResolvedValue(undefined),
  setStoryLiked: vi.fn().mockResolvedValue(undefined),
  deleteOwnStory: vi.fn().mockResolvedValue(undefined),
}));

const chatMocks = vi.hoisted(() => ({
  listChatConversations: vi.fn().mockResolvedValue([{
    conversationId: 'conversation-1',
    profileId: 'profile-1',
    displayName: 'Maria Silva',
    avatarUrl: null,
    accountType: 'donor' as const,
    lastMessage: 'Olá',
    lastMessageAt: '2026-09-08T12:00:00.000Z',
    unreadCount: 0,
    donorTier: 'new_donor' as const,
    approvedDonationCount: 1,
  }]),
  sendChatMessage: vi.fn().mockResolvedValue({
    id: 'message-1',
    conversationId: 'conversation-1',
    senderProfileId: 'sender-1',
    body: 'História',
    sentAt: '2026-09-08T12:00:01.000Z',
  }),
}));

vi.mock('@/lib/chat', () => ({
  listChatConversations: chatMocks.listChatConversations,
  sendChatMessage: chatMocks.sendChatMessage,
  getChatErrorMessage: () => 'Não foi possível concluir agora.',
}));
vi.mock('@/lib/stories', () => ({
  ...storyMocks,
  storyErrorMessage: () => 'Não foi possível publicar.',
}));

vi.mock('@/lib/publicStoryImages', () => ({
  loadPublicStoryImages: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/demoData', () => ({
  demoDataEnabled: true,
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
    storyMocks.setStoryLiked.mockClear();
    storyMocks.publishStory.mockClear();
    storyMocks.deleteOwnStory.mockClear();
    chatMocks.listChatConversations.mockClear();
    chatMocks.sendChatMessage.mockClear();
  });

  afterEach(() => {
    cleanup();
    intersectionCallback = null;
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.useRealTimers();
  });

  it('uses the new editorial copy and restores likes without comments', async () => {
    render(<Stories onOpenNGO={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Histórias que aproximam.' })).not.toBeNull();
    expect(screen.getByText('Conheça de perto as pessoas, os momentos e as causas que estão acontecendo por aqui.')).not.toBeNull();
    expect(screen.queryByLabelText('Compartilhar uma história')).toBeNull();

    await waitFor(() => expect(screen.getAllByRole('article', { hidden: true }).length).toBeGreaterThan(8));
    expect(screen.getAllByRole('button', { name: 'Curtir história', hidden: true }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Comentar', hidden: true })).toBeNull();
    expect(screen.queryByText('SIMULAÇÃO')).toBeNull();
    expect(screen.queryByText('Momentos e vozes das causas', { exact: true })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Seguindo', hidden: true })).toBeNull();
    expect(screen.getAllByRole('tab', { hidden: true })).toHaveLength(2);
  });

  it('keeps the feed preview inside the circular carousel using document scroll', async () => {
    const { container } = render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(container.querySelectorAll('article').length).toBeGreaterThan(8));
    const initialCount = container.querySelectorAll('article').length;
    expect(container.querySelector('[data-circular-story-gallery]')).not.toBeNull();
    expect(container.querySelector('.scroll-expand--content-preview')).not.toBeNull();
    expect(container.querySelector('.scroll-expand--window')).not.toBeNull();
    await act(async () => {
      intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(container.querySelectorAll('article')).toHaveLength(initialCount);
  });

  it('shows local videos first and renders social posts directly in the feed and circular preview', async () => {
    const { container } = render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(container.querySelectorAll('article').length).toBeGreaterThan(4));
    const articles = container.querySelectorAll('article');
    expect(articles[0].querySelector('video')?.getAttribute('src')).toContain('tranquilicare_1786385739');
    expect(articles[1].querySelector('video')?.getAttribute('src')).toContain('tranquilicare_1786723077');
    expect(articles[2].querySelector('iframe')?.getAttribute('src')).toContain('/embed/');
    expect(Array.from(articles).filter((article) => article.querySelector('iframe')).length).toBeGreaterThan(1);
    expect(screen.queryByText('Ver publicação incorporada')).toBeNull();
    const circularCards = container.querySelectorAll('[data-circular-story-card]');
    expect(circularCards[0].querySelector('video')?.getAttribute('src')).toContain('tranquilicare_1786385739');
    expect(circularCards[1].querySelector('video')?.getAttribute('src')).toContain('tranquilicare_1786723077');
    expect(circularCards[2].querySelector('iframe')).not.toBeNull();
  });
  it('opens the draggable publisher and publishes a real organization story', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} canTellStory />);
    await user.click(screen.getByRole('button', { name: 'Criar nova história' }));
    const composer = screen.getByRole('dialog', { name: 'O que aconteceu por aí?' });
    const input = within(composer).getByRole('textbox', { name: 'Escreva sua história' });
    await user.type(input, 'Hoje abrimos um novo espaço de acolhimento.');
    await user.click(within(composer).getByRole('button', { name: 'Categoria da história' }));
    await user.click(await screen.findByRole('option', { name: 'Educação' }));
    await user.click(within(composer).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(storyMocks.publishStory).toHaveBeenCalledWith('Hoje abrimos um novo espaço de acolhimento.', null, null, 'educacao'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'O que aconteceu por aí?' })).toBeNull());
  });

  it('renders sharing in a viewport portal and restores the button after a completed copy', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByRole('article', { hidden: true }).length).toBeGreaterThan(0));

    fireEvent.click(within(screen.getAllByRole('article', { hidden: true })[0]).getByRole('button', { name: 'Compartilhar', hidden: true }));
    const shareMenu = await screen.findByRole('menu', { name: 'Compartilhar história por', hidden: true });
    expect(shareMenu.className).toContain('fixed');
    await user.click(within(shareMenu).getByRole('menuitem', { name: /Instagram/i, hidden: true }));
    await waitFor(() => expect(screen.getByText('Compartilhamento concluído')).not.toBeNull());
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 1500)); });
    expect(screen.queryByText('Compartilhamento concluído')).toBeNull();
    expect(within(screen.getAllByRole('article', { hidden: true })[0]).getByRole('button', { name: 'Compartilhar', hidden: true })).not.toBeNull();
  });

  it('sends a story to a recent TranquiliCare conversation through the real chat action', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByRole('article', { hidden: true }).length).toBeGreaterThan(0));

    const firstStory = screen.getAllByRole('article', { hidden: true })[0];
    fireEvent.click(within(firstStory).getByRole('button', { name: 'Compartilhar', hidden: true }));
    const shareMenu = await screen.findByRole('menu', { name: 'Compartilhar história por', hidden: true });
    await user.click(within(shareMenu).getByRole('menuitem', { name: /TranquiliCare/i, hidden: true }));

    await screen.findByRole('dialog', { name: 'Compartilhar com contato recente', hidden: true });
    await user.click(await screen.findByRole('button', { name: /Maria Silva/i, hidden: true }));
    await waitFor(() => expect(chatMocks.sendChatMessage).toHaveBeenCalledWith('conversation-1', expect.stringContaining('#story-')));
    expect(screen.getByText('História enviada para Maria Silva')).not.toBeNull();
  });
  it('allows a signed-in donor to publish a story too', async () => {
    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} canTellStory />);
    await user.click(screen.getByRole('button', { name: 'Criar nova história' }));
    const composer = screen.getByRole('dialog', { name: 'O que aconteceu por aí?' });
    await user.type(within(composer).getByRole('textbox', { name: 'Escreva sua história' }), 'Quero compartilhar este momento com a comunidade.');
    await user.click(within(composer).getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(storyMocks.publishStory).toHaveBeenCalledWith('Quero compartilhar este momento com a comunidade.', null, null, null));
  });

  it('keeps text-only stories compact and shows the selected category', async () => {
    storyMocks.loadPublishedStories.mockResolvedValueOnce([{
      id: 'text-only', url: '', type: 'image', caption: 'Um gesto de cuidado.', category: 'pets',
      timestamp: Date.now(), ngoId: null, authorProfileId: 'donor-1', ngoName: 'Ana', ngoImage: '/avatar.png', persisted: true,
    }]);
    const { container } = render(<Stories onOpenNGO={vi.fn()} />);
    await waitFor(() => expect(container.querySelector('#story-text-only')).not.toBeNull());
    const article = container.querySelector('#story-text-only')!;
    expect(article.getAttribute('data-category')).toBe('pets');
    expect(article.textContent).toContain('Um gesto de cuidado.');
    expect(article.querySelector('[role="button"]')).toBeNull();
    expect(article.querySelector('video')).toBeNull();
    expect(article.querySelector('img[src=""]')).toBeNull();
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

    fireEvent.click(within(firstStory).getByRole('button', { name: 'Curtir história', hidden: true }));
    expect(within(firstStory).getByRole('button', { name: 'Remover curtida', hidden: true })).not.toBeNull();
    expect(within(firstStory).getByRole('button', { name: 'Remover curtida', hidden: true }).querySelector('.fill-current')).not.toBeNull();
    expect(storyMocks.setStoryLiked).toHaveBeenCalledOnce();

    fireEvent.click(within(firstStory).getByRole('button', { name: 'Remover curtida', hidden: true }));
    expect(within(firstStory).getByRole('button', { name: 'Curtir história', hidden: true })).not.toBeNull();
    expect(storyMocks.setStoryLiked).toHaveBeenCalledTimes(2);

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

  it('offers timed deletion only to the story owner', async () => {
    storyMocks.loadStoryViewerState.mockResolvedValueOnce({
      savedStoryIds: new Set<string>(),
      likedStoryIds: new Set<string>(),
      reportedStoryIds: new Set<string>(),
      followedOrganizationIds: new Set<string>(),
      currentProfileId: 'owner-profile',
    });
    storyMocks.loadPublishedStories.mockResolvedValueOnce([{
      id: '86d0cf8c-2f44-4a7b-839f-3f9af961ea11',
      url: '/images/founder-story.webp',
      type: 'image',
      caption: 'Uma história que posso excluir.',
      timestamp: Date.now(),
      ngoId: null,
      ngoName: 'Leo',
      ngoImage: '/images/tranquilicare-heart-transparent.png',
      authorProfileId: 'owner-profile',
      persisted: true,
    }]);

    const user = userEvent.setup();
    render(<Stories onOpenNGO={vi.fn()} canTellStory />);
    const ownerCaption = await screen.findByText('Uma história que posso excluir.');
    const ownerArticle = ownerCaption.closest('article');
    if (!ownerArticle) throw new Error('owner-story-not-found');
    fireEvent.click(within(ownerArticle).getByRole('button', { name: 'Mais opções', hidden: true }));
    expect(await screen.findByRole('button', { name: 'Excluir história', hidden: true })).not.toBeNull();
  });
  it('keeps the document as the only vertical scroller for stories', async () => {
    const { container } = render(<Stories onOpenNGO={vi.fn()} />);
    expect(container.querySelector('.scroll-expand--content-preview')).not.toBeNull();
    expect(container.querySelector('.scroll-expand--window')).not.toBeNull();
    expect(container.querySelector('.overflow-y-auto')).toBeNull();
    expect(screen.getByTestId('story-feed-tabs').classList.contains('sticky')).toBe(true);
  });
});
