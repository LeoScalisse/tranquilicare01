import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, MessageCircle, Plus, Search, Send, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import AppBottomNav from '@/components/AppBottomNav';
import { AlertToast } from '@/components/ui/alert-toast';
import { authReady, getUser, onAuthChange, type AppUser } from '@/lib/auth';
import {
  getChatErrorMessage,
  listChatConversations,
  listChatMessages,
  markChatRead,
  searchChatUsers,
  sendChatMessage,
  startDirectChat,
  startOrganizationChat,
  subscribeToChatInbox,
  type ChatConversation,
  type ChatMessage,
  type ChatUser,
} from '@/lib/chat';
import logo from '@/assets/logo.png';
import { SmoothInput } from '@/components/ui/smooth-input';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'TC';

const formatListTime = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
};

const formatMessageTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

const Avatar = ({ user, size = 'md' }: { user: Pick<ChatUser, 'displayName' | 'avatarUrl'>; size?: 'sm' | 'md' | 'lg' }) => {
  const classes = size === 'lg' ? 'h-14 w-14 text-base' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm';
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt='' className={`${classes} shrink-0 rounded-full object-cover ring-1 ring-border`} />
  ) : (
    <span aria-hidden='true' className={`${classes} grid shrink-0 place-items-center rounded-full bg-brand-blue/15 font-bold text-brand-blue ring-1 ring-brand-blue/15`}>
      {initials(user.displayName)}
    </span>
  );
};

const donorLabels: Record<string, { label: string; className: string }> = {
  not_donor: { label: 'Ainda não doou', className: 'bg-slate-100 text-slate-600' },
  new_donor: { label: 'Novo doador', className: 'bg-sky-100 text-sky-700' },
  recurring_donor: { label: 'Doador recorrente', className: 'bg-amber-100 text-amber-800' },
  loyal_donor: { label: 'Doador fiel', className: 'bg-emerald-100 text-emerald-700' },
};

const ContactTier = ({ conversation }: { conversation: ChatConversation }) => {
  if (!conversation.donorTier) return null;
  const tier = donorLabels[conversation.donorTier];
  if (!tier) return null;
  const detail = conversation.approvedDonationCount === 1 ? '1 doação aprovada' : `${conversation.approvedDonationCount ?? 0} doações aprovadas`;
  return <span title={detail} className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.className}`}>{tier.label}</span>;
};

const Chats: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();
  const [user, setUser] = useState<AppUser | null>(getUser());
  const [authHydrated, setAuthHydrated] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('conversation'));
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<ChatUser[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const startedProfileRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthChange(setUser);
    void authReady.finally(() => {
      if (!active) return;
      setUser(getUser());
      setAuthHydrated(true);
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!getUser()) return;
    try {
      const next = await listChatConversations();
      setConversations(next);
      setError(null);
      return next;
    } catch (cause) {
      setError(getChatErrorMessage(cause));
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (!authHydrated || !user) { if (authHydrated) setLoadingConversations(false); return; }
    void refreshConversations();
  }, [authHydrated, refreshConversations, user]);

  useEffect(() => {
    if (!authHydrated || !user) return;
    const targetProfile = searchParams.get('profile');
    const targetOrganization = searchParams.get('organization');
    const targetKey = targetProfile ? 'profile:' + targetProfile : targetOrganization ? 'organization:' + targetOrganization : null;
    if (!targetKey || startedProfileRef.current === targetKey) return;
    startedProfileRef.current = targetKey;
    let active = true;
    setLoadingConversations(true);
    void (targetProfile ? startDirectChat(targetProfile) : startOrganizationChat(targetOrganization!))
      .then(async (conversationId) => {
        if (!active) return;
        await refreshConversations();
        setSelectedId(conversationId);
        setSearchParams({ conversation: conversationId }, { replace: true });
      })
      .catch((cause) => { if (active) setError(getChatErrorMessage(cause)); })
      .finally(() => { if (active) setLoadingConversations(false); });
    return () => { active = false; };
  }, [authHydrated, refreshConversations, searchParams, setSearchParams, user]);

  const selectedConversation = useMemo(() => conversations.find((item) => item.conversationId === selectedId) ?? null, [conversations, selectedId]);

  useEffect(() => {
    if (!selectedId || !user) { setMessages([]); return; }
    let active = true;
    setLoadingMessages(true);
    setError(null);
    void listChatMessages(selectedId)
      .then((next) => { if (active) setMessages(next); })
      .catch((cause) => { if (active) setError(getChatErrorMessage(cause)); })
      .finally(() => { if (active) setLoadingMessages(false); });
    void markChatRead(selectedId).then(refreshConversations).catch(() => undefined);
    return () => { active = false; };

  }, [refreshConversations, selectedId, user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToChatInbox((message) => {
      if (message.conversationId === selectedId) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        if (message.senderProfileId !== user.id) void markChatRead(message.conversationId).catch(() => undefined);
      }
      void refreshConversations();
    });
  }, [refreshConversations, selectedId, user]);
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'end' });
  }, [messages, reducedMotion]);

  useEffect(() => {
    if (!showNewChat || !user) return;
    const timer = window.setTimeout(() => {
      setSearchingContacts(true);
      void searchChatUsers(contactQuery)
        .then(setContactResults)
        .catch((cause) => setError(getChatErrorMessage(cause)))
        .finally(() => setSearchingContacts(false));
    }, contactQuery ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [contactQuery, showNewChat, user]);

  const openContactProfile = (contact: ChatUser) => {
    navigate((contact.accountType === 'ngo' ? '/ong/' : '/perfil/') + contact.profileId);
  };

  const selectConversation = (conversationId: string) => {
    setSelectedId(conversationId);
    setSearchParams({ conversation: conversationId }, { replace: true });
  };

  const beginConversation = async (contact: ChatUser) => {
    try {
      setSearchingContacts(true);
      const conversationId = await startDirectChat(contact.profileId);
      await refreshConversations();
      setShowNewChat(false);
      setContactQuery('');
      selectConversation(conversationId);
    } catch (cause) {
      setError(getChatErrorMessage(cause));
    } finally {
      setSearchingContacts(false);
    }
  };

  const submitMessage = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    const preservedDraft = draft;
    setSending(true);
    setDraft('');
    setError(null);
    try {
      const message = await sendChatMessage(selectedId, preservedDraft);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      await refreshConversations();
    } catch (cause) {
      setDraft(preservedDraft);
      setError(getChatErrorMessage(cause));
    } finally {
      setSending(false);
    }
  };

  if (authHydrated && !user) {
    return (
      <main id='main-content' className='grid min-h-screen place-items-center bg-[#f6f8fb] px-5 pb-24'>
        <section className='w-full max-w-md rounded-[28px] border border-border bg-background p-8 text-center shadow-sm'>
          <img src={logo} alt='' className='mx-auto mb-5 h-14 w-14 rounded-2xl' />
          <h1 className='text-2xl font-bold text-brand-ink'>Suas conversas ficam protegidas</h1>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>Entre na sua conta para conversar com doadores e ONGs do TranquiliCare.</p>
          <button onClick={() => navigate('/donor/auth?mode=login&redirect=/chats')} className='mt-6 h-12 w-full rounded-2xl bg-brand-blue font-bold text-white shadow-[0_8px_22px_rgba(55,181,247,0.25)]'>Entrar para conversar</button>
        </section>
        <AppBottomNav activeKey='chat' user={null} />
      </main>
    );
  }

  return (
    <main id='main-content' className='min-h-screen bg-[#f4f6f9] pb-24 md:pb-0'>
      <header className='sticky top-0 z-30 border-b border-black/5 bg-background/90 px-4 py-3 backdrop-blur-xl md:px-6'>
        <div className='mx-auto flex max-w-7xl items-center justify-between'>
          <button onClick={() => navigate('/')} className='flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20' aria-label='Voltar ao início'>
            <img src={logo} alt='' className='h-9 w-9 rounded-xl' />
            <span className='hidden font-display font-semibold text-brand-ink sm:inline'>Tranquili<span className='text-brand-blue'>Care</span></span>
          </button>
          <span className='font-bold text-brand-ink md:hidden'>Conversas</span>
          <span className='w-9 md:hidden' aria-hidden='true' />
        </div>
      </header>

      {error && <div className='fixed right-4 top-20 z-50 w-[calc(100%-2rem)] max-w-sm'><AlertToast variant='error' title='Não foi possível concluir' description={error} onClose={() => setError(null)} /></div>}

      <div className='mx-auto grid h-[calc(100dvh-64px)] max-w-7xl overflow-hidden border-x border-black/5 bg-background md:grid-cols-[360px_1fr]'>
        <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} min-w-0 flex-col border-r border-black/5 bg-white`} aria-label='Lista de conversas'>
          <div className='border-b border-black/5 p-4'>
            <div className='flex items-center justify-between'>
              <div><h1 className='text-2xl font-bold tracking-tight text-brand-ink'>Conversas</h1><p className='mt-0.5 text-xs text-muted-foreground'>Mensagens privadas</p></div>
              <button onClick={() => setShowNewChat((value) => !value)} aria-expanded={showNewChat} className='grid h-11 w-11 place-items-center rounded-full bg-brand-blue text-white shadow-[0_8px_20px_rgba(55,181,247,0.25)] transition-transform active:scale-[0.96]' aria-label={showNewChat ? 'Fechar busca' : 'Nova conversa'}>
                {showNewChat ? <X size={20} /> : <Plus size={21} />}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showNewChat && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }} className='overflow-hidden'>
                  <label className='mt-4 flex h-11 items-center gap-2 rounded-2xl bg-[#f1f3f6] px-3 focus-within:ring-2 focus-within:ring-brand-blue/25'>
                    <Search size={17} className='text-muted-foreground' />
                    <span className='sr-only'>Buscar pessoa ou ONG</span>
                    <SmoothInput wrapperClassName='min-w-0 flex-1' autoFocus value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder='Buscar pessoa ou ONG' className='w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground' />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            {showNewChat ? (
              searchingContacts && contactResults.length === 0 ? <ListSkeleton /> : contactResults.length > 0 ? contactResults.map((contact) => (
                <button key={contact.profileId} onClick={(event) => { if ((event.target as Element).closest('[data-chat-avatar]')) { openContactProfile(contact); return; } void beginConversation(contact); }} className='flex w-full items-center gap-3 border-b border-black/[0.04] px-4 py-3 text-left hover:bg-brand-blue/[0.05] focus-visible:bg-brand-blue/[0.08] focus-visible:outline-none'>
                  <span data-chat-avatar className='rounded-full'><Avatar user={contact} /></span>
                  <span className='min-w-0'><span className='block truncate font-semibold text-brand-ink'>{contact.displayName}</span><span className='block text-xs text-muted-foreground'>{contact.accountType === 'ngo' ? 'ONG' : 'Doador'}</span></span>
                </button>
              )) : <EmptySearch query={contactQuery} />
            ) : loadingConversations ? <ListSkeleton /> : conversations.length === 0 ? (
              <div className='grid h-full place-items-center px-8 text-center'>
                <div><span className='mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue'><MessageCircle size={26} /></span><h2 className='mt-4 font-bold text-brand-ink'>Suas conversas começam aqui</h2><p className='mt-1 text-sm leading-5 text-muted-foreground'>Fale diretamente com pessoas e ONGs da comunidade.</p><button onClick={() => setShowNewChat(true)} className='mt-5 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-bold text-white'>Nova conversa</button></div>
              </div>
            ) : conversations.map((conversation) => (
              <button key={conversation.conversationId} onClick={(event) => { if ((event.target as Element).closest('[data-chat-avatar]')) { openContactProfile(conversation); return; } selectConversation(conversation.conversationId); }} className={`flex w-full items-start gap-3 border-b border-black/[0.04] px-4 py-3.5 text-left transition-colors hover:bg-brand-blue/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue/30 ${selectedId === conversation.conversationId ? 'bg-brand-blue/[0.08]' : ''}`}>
                <span data-chat-avatar className='rounded-full'><Avatar user={conversation} /></span>
                <span className='min-w-0 flex-1'><span className='flex items-baseline justify-between gap-2'><span className='truncate font-semibold text-brand-ink'>{conversation.displayName}</span><span className='shrink-0 text-[11px] text-muted-foreground'>{formatListTime(conversation.lastMessageAt)}</span></span><span className='mt-0.5 flex items-center gap-2'><span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>{conversation.lastMessage || 'Conversa iniciada'}</span>{conversation.unreadCount > 0 && <span className='grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-white'>{Math.min(conversation.unreadCount, 99)}</span>}</span><ContactTier conversation={conversation} /></span>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-w-0 flex-col bg-[#f7f8fa]`} aria-label='Conversa atual'>
          {selectedConversation ? (
            <>
              <div className='flex h-[68px] shrink-0 items-center gap-3 border-b border-black/5 bg-white px-3 sm:px-5'>
                <button onClick={() => { setSelectedId(null); setSearchParams({}, { replace: true }); }} className='grid h-10 w-10 place-items-center rounded-full text-brand-ink hover:bg-black/5 md:hidden' aria-label='Voltar às conversas'><ArrowLeft size={21} /></button>
                <button type='button' onClick={() => openContactProfile(selectedConversation)} className='shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20' aria-label={'Abrir perfil de ' + selectedConversation.displayName}><Avatar user={selectedConversation} size='sm' /></button>
                <div className='min-w-0'><h2 className='truncate font-bold text-brand-ink'>{selectedConversation.displayName}</h2><p className='text-xs text-muted-foreground'>{selectedConversation.accountType === 'ngo' ? 'ONG no TranquiliCare' : 'Doador no TranquiliCare'}</p></div>
                <div className='ml-auto'><ContactTier conversation={selectedConversation} /></div>
              </div>

              <div className='min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8' aria-live='polite' aria-busy={loadingMessages}>
                {loadingMessages ? <MessageSkeleton /> : messages.length === 0 ? <div className='grid h-full place-items-center text-center'><div><button type='button' onClick={() => openContactProfile(selectedConversation)} className='mx-auto block w-fit rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20' aria-label={'Abrir perfil de ' + selectedConversation.displayName}><Avatar user={selectedConversation} size='lg' /></button><h3 className='mt-3 font-bold text-brand-ink'>{selectedConversation.displayName}</h3><p className='mt-1 text-sm text-muted-foreground'>Envie uma mensagem para iniciar a conversa.</p></div></div> : (
                  <div className='mx-auto flex max-w-3xl flex-col gap-2.5'>
                    {messages.map((message) => {
                      const mine = message.senderProfileId === user?.id;
                      return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-[20px] px-4 py-2.5 shadow-sm sm:max-w-[68%] ${mine ? 'rounded-br-md bg-brand-blue text-white' : 'rounded-bl-md border border-black/5 bg-white text-brand-ink'}`}><p className='whitespace-pre-wrap break-words text-[15px] leading-5'>{message.body}</p><span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/75' : 'text-muted-foreground'}`}>{formatMessageTime(message.sentAt)}{mine && <CheckCheck size={12} aria-label='Enviada' />}</span></div></div>;
                    })}
                    <div ref={messageEndRef} />
                  </div>
                )}
              </div>

              <form onSubmit={(event) => { event.preventDefault(); void submitMessage(); }} className='shrink-0 border-t border-black/5 bg-white p-3 sm:p-4'>
                <div className='mx-auto flex max-w-3xl items-end gap-2 rounded-[24px] bg-[#eef1f4] p-1.5 pl-4 focus-within:ring-2 focus-within:ring-brand-blue/25'>
                  <label htmlFor='chat-message' className='sr-only'>Mensagem</label>
                  <SmoothTextarea wrapperClassName='min-w-0 flex-1' id='chat-message' rows={1} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submitMessage(); } }} placeholder='Escreva uma mensagem' className='max-h-32 min-h-10 w-full resize-none bg-transparent py-2.5 text-[15px] leading-5 outline-none placeholder:text-muted-foreground' />
                  <button type='submit' disabled={!draft.trim() || sending} className='grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-blue text-white transition-[opacity,transform] active:scale-[0.96] disabled:opacity-40' aria-label={sending ? 'Enviando mensagem' : 'Enviar mensagem'}><Send size={18} className={sending ? 'animate-pulse' : ''} /></button>
                </div>
                <p className='mx-auto mt-1.5 max-w-3xl px-2 text-right text-[10px] text-muted-foreground'>{draft.length}/4000</p>
              </form>
            </>
          ) : (
            <div className='grid h-full place-items-center px-8 text-center'><div><span className='mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-brand-blue/10 text-brand-blue'><MessageCircle size={30} /></span><h2 className='mt-4 text-xl font-bold text-brand-ink'>Selecione uma conversa</h2><p className='mt-1 text-sm text-muted-foreground'>Suas mensagens aparecerão aqui.</p></div></div>
          )}
        </section>
      </div>
      <AppBottomNav activeKey='chat' user={user} />
    </main>
  );
};

const ListSkeleton = () => <div className='space-y-1 p-3' aria-label='Carregando conversas'>{[0, 1, 2, 3].map((item) => <div key={item} className='flex animate-pulse gap-3 rounded-xl p-2'><span className='h-12 w-12 rounded-full bg-slate-200' /><span className='flex-1 space-y-2 py-1'><span className='block h-3 w-1/2 rounded bg-slate-200' /><span className='block h-2.5 w-4/5 rounded bg-slate-100' /></span></div>)}</div>;
const MessageSkeleton = () => <div className='mx-auto max-w-3xl animate-pulse space-y-4' aria-label='Carregando mensagens'><div className='h-14 w-2/3 rounded-[20px] bg-white' /><div className='ml-auto h-20 w-3/5 rounded-[20px] bg-brand-blue/15' /><div className='h-12 w-1/2 rounded-[20px] bg-white' /></div>;
const EmptySearch = ({ query }: { query: string }) => <div className='px-8 py-12 text-center'><Search className='mx-auto text-slate-300' size={28} /><p className='mt-3 text-sm font-semibold text-brand-ink'>{query ? 'Nenhum perfil encontrado' : 'Encontre alguém para conversar'}</p><p className='mt-1 text-xs leading-5 text-muted-foreground'>{query ? 'Confira o nome e tente novamente.' : 'Busque pelo nome de uma pessoa ou ONG.'}</p></div>;

export default Chats;