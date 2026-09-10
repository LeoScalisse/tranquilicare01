import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Chats from '../Chats';
import { getUser } from '@/lib/auth';
import { listChatMessages } from '@/lib/chat';

vi.mock('@/lib/auth', () => ({ getUser: vi.fn(), authReady: Promise.resolve(), onAuthChange: () => () => {} }));
vi.mock('@/components/AppBottomNav', () => ({ default: () => null }));
vi.mock('@/lib/chat', () => ({
  listChatConversations: vi.fn(async () => [{ conversationId: 'conversation-1', profileId: 'other', displayName: 'Ana', accountType: 'donor', avatarUrl: null, lastMessage: 'Mensagem recebida', lastMessageAt: '2026-09-10T12:00:00Z', unreadCount: 1 }]),
  listChatMessages: vi.fn(), markChatRead: vi.fn(async () => {}),
  subscribeToChatInbox: () => () => {}, getChatErrorMessage: () => 'Falha de conexão',
  searchChatUsers: vi.fn(), sendChatMessage: vi.fn(), startDirectChat: vi.fn(), startOrganizationChat: vi.fn(),
}));
function Location() { const location = useLocation(); return <output data-testid='location'>{location.pathname + location.search}</output>; }
const show = () => render(<MemoryRouter initialEntries={['/chats?conversation=conversation-1']}><Chats /><Location /></MemoryRouter>);
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); vi.mocked(getUser).mockReturnValue(null); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Chat entry and received messages', () => {
  it('invites a guest to sign in without redirecting automatically and preserves the destination', async () => {
    show();
    const login = await screen.findByRole('button', { name: 'Entrar para conversar' });
    expect(screen.getByTestId('location').textContent).toBe('/chats?conversation=conversation-1');
    fireEvent.click(login);
    expect(screen.getByTestId('location').textContent).toContain('redirect=%2Fchats%3Fconversation%3Dconversation-1');
  });
  it('renders received message history inside the selected conversation', async () => {
    vi.mocked(getUser).mockReturnValue({ id: 'me', name: 'Eu', accountType: 'donor' } as ReturnType<typeof getUser>);
    vi.mocked(listChatMessages).mockResolvedValue([{ id: 'message-1', conversationId: 'conversation-1', senderProfileId: 'other', body: 'Olá, seu apoio chegou!', sentAt: '2026-09-10T12:00:00Z' }]);
    show();
    expect(await screen.findByText('Olá, seu apoio chegou!')).toBeTruthy();
    expect(screen.queryByText('Envie uma mensagem para iniciar a conversa.')).toBeNull();
  });
  it('shows a recoverable load error instead of claiming that the conversation is empty', async () => {
    vi.mocked(getUser).mockReturnValue({ id: 'me', name: 'Eu', accountType: 'donor' } as ReturnType<typeof getUser>);
    vi.mocked(listChatMessages).mockRejectedValueOnce(new Error('network')).mockResolvedValue([]);
    show();
    expect(await screen.findByText('Falha de conexão')).toBeTruthy();
    expect(screen.queryByText('Envie uma mensagem para iniciar a conversa.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Tentar carregar mensagens novamente/i }));
    await waitFor(() => expect(listChatMessages).toHaveBeenCalledTimes(2));
  });
});
