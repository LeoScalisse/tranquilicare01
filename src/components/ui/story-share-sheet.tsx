import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Check, Instagram, MessageCircle, Share2, UsersRound, X, type LucideIcon } from 'lucide-react';
import { FiShare } from 'react-icons/fi';
import { toast } from 'sonner';

import { getChatErrorMessage, listChatConversations, sendChatMessage, type ChatConversation } from '@/lib/chat';

type ShareStatus = 'idle' | 'open' | 'loading-contacts' | 'contacts' | 'sending' | 'success';
type ShareTargetId = 'whatsapp' | 'instagram' | 'tranquilicare';

interface ShareTarget {
  id: ShareTargetId;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
}

interface StoryShareSheetProps {
  storyId: string;
  storyTitle: string;
}

const SHARE_TARGETS: ShareTarget[] = [
  { id: 'whatsapp', label: 'WhatsApp', description: 'Enviar em uma conversa', icon: MessageCircle, iconClassName: 'bg-[#DCF8E8] text-[#128C4A]' },
  { id: 'instagram', label: 'Instagram', description: 'Copiar link da história', icon: Instagram, iconClassName: 'bg-[#FDE7EF] text-[#C13584]' },
  { id: 'tranquilicare', label: 'TranquiliCare', description: 'Enviar para um contato recente', icon: UsersRound, iconClassName: 'bg-[#DDF2FC] text-brand-blue' },
];

const SPRING = { type: 'spring', stiffness: 240, damping: 20, mass: 1 } as const;
const SUCCESS_DURATION_MS = 1400;
const PANEL_WIDTH = 340;
const VIEWPORT_GAP = 12;

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export const StoryShareSheet: React.FC<StoryShareSheetProps> = ({ storyId, storyTitle }) => {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [selectedTarget, setSelectedTarget] = useState<ShareTarget | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState({ left: VIEWPORT_GAP, top: VIEWPORT_GAP, origin: 'bottom right' });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const resetTimerRef = useRef<number | null>(null);
  const panelVisible = status === 'open' || status === 'loading-contacts' || status === 'contacts';
  const showingContacts = status === 'loading-contacts' || status === 'contacts';
  const panelHeight = showingContacts ? 420 : 246;

  const recentConversations = useMemo(() => conversations.slice(0, 7), [conversations]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
    const height = Math.min(panelHeight, window.innerHeight - VIEWPORT_GAP * 2);
    const left = Math.min(Math.max(VIEWPORT_GAP, rect.right - width), window.innerWidth - width - VIEWPORT_GAP);
    const fitsAbove = rect.top - height - VIEWPORT_GAP >= VIEWPORT_GAP;
    const top = fitsAbove ? rect.top - height - VIEWPORT_GAP : Math.min(rect.bottom + VIEWPORT_GAP, window.innerHeight - height - VIEWPORT_GAP);
    setPanelPosition({ left, top: Math.max(VIEWPORT_GAP, top), origin: fitsAbove ? 'bottom right' : 'top right' });
  }, [panelHeight]);

  useEffect(() => {
    if (!panelVisible) return undefined;
    updatePanelPosition();
    window.requestAnimationFrame(() => firstOptionRef.current?.focus());
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [panelVisible, updatePanelPosition]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelVisible && !triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setStatus('idle');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !panelVisible) return;
      if (showingContacts) setStatus('open');
      else {
        setStatus('idle');
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [panelVisible, showingContacts]);

  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
  }, []);

  const storyUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}#story-${storyId}`;
  const finishSuccess = () => {
    setStatus('success');
    resetTimerRef.current = window.setTimeout(() => {
      setStatus('idle');
      setSelectedTarget(null);
      setSelectedConversation(null);
    }, SUCCESS_DURATION_MS);
  };

  const openRecentContacts = async (target: ShareTarget) => {
    setSelectedTarget(target);
    setContactsError(null);
    setStatus('loading-contacts');
    try {
      setConversations(await listChatConversations());
      setStatus('contacts');
    } catch (error) {
      setContactsError(getChatErrorMessage(error));
      setStatus('contacts');
    }
  };

  const handleTarget = async (target: ShareTarget) => {
    if (target.id === 'tranquilicare') {
      await openRecentContacts(target);
      return;
    }
    const url = storyUrl();
    const message = `${storyTitle}\n${url}`;
    setSelectedTarget(target);
    setStatus('sending');
    try {
      if (target.id === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      else {
        await copyText(url);
        toast.success('Link copiado.');
      }
      finishSuccess();
    } catch {
      toast.error('Não foi possível preparar o compartilhamento.');
      setStatus('idle');
      setSelectedTarget(null);
    }
  };

  const handleConversation = async (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setStatus('sending');
    try {
      await sendChatMessage(conversation.conversationId, `${storyTitle}\n${storyUrl()}`);
      finishSuccess();
    } catch (error) {
      toast.error(getChatErrorMessage(error));
      setStatus('contacts');
      setSelectedConversation(null);
    }
  };

  const SelectedIcon = selectedTarget?.icon ?? Share2;
  const circumference = 2 * Math.PI * 16;
  const panel = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence initial={false}>
      {panelVisible && (
        <motion.div
          ref={panelRef}
          role={showingContacts ? 'dialog' : 'menu'}
          aria-label={showingContacts ? 'Compartilhar com contato recente' : 'Compartilhar história por'}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 9 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 6 }}
          transition={reduceMotion ? { duration: 0.01 } : SPRING}
          style={{ left: panelPosition.left, top: panelPosition.top, transformOrigin: panelPosition.origin }}
          className='fixed z-[170] flex max-h-[min(420px,calc(100dvh-1.5rem))] w-[min(21.25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-background/95 p-2 shadow-[0_24px_70px_-24px_rgba(15,36,60,0.55)] backdrop-blur-xl'
        >
          <AnimatePresence mode='wait' initial={false}>
            {showingContacts ? (
              <motion.div key='contacts' className='flex min-h-0 flex-col' initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: reduceMotion ? 0.01 : 0.2 }}>
                <div className='flex items-center gap-2 px-1 pb-2 pt-1'>
                  <button type='button' onClick={() => setStatus('open')} className='grid h-9 w-9 place-items-center rounded-full text-brand-ink hover:bg-secondary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20' aria-label='Voltar às opções'><ArrowLeft size={18} /></button>
                  <div className='min-w-0 flex-1'><p className='truncate text-sm font-bold text-brand-ink'>Enviar no TranquiliCare</p><p className='text-xs text-muted-foreground'>Conversas mais recentes</p></div>
                  <button type='button' onClick={() => setStatus('idle')} className='grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20' aria-label='Fechar'><X size={17} /></button>
                </div>
                <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1'>
                  {status === 'loading-contacts' ? (
                    <div className='grid min-h-56 place-items-center' role='status'><span className='h-8 w-8 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue' aria-label='Carregando contatos' /></div>
                  ) : contactsError ? (
                    <div className='grid min-h-56 place-items-center px-6 text-center'><div><p className='text-sm font-bold text-brand-ink'>Não foi possível carregar</p><p className='mt-1 text-xs leading-5 text-muted-foreground'>{contactsError}</p><button type='button' onClick={() => selectedTarget && void openRecentContacts(selectedTarget)} className='tc-button-3d text-white rounded-xl mt-4 px-4 py-2 text-sm font-bold'>Tentar novamente</button></div></div>
                  ) : recentConversations.length === 0 ? (
                    <div className='grid min-h-56 place-items-center px-6 text-center'><div><MessageCircle className='mx-auto text-brand-blue' size={28} /><p className='mt-3 text-sm font-bold text-brand-ink'>Nenhuma conversa recente</p><p className='mt-1 text-xs leading-5 text-muted-foreground'>Inicie uma conversa pelo perfil de uma pessoa ou ONG para compartilhar por aqui.</p></div></div>
                  ) : recentConversations.map((conversation, index) => (
                    <motion.button
                      ref={index === 0 ? firstOptionRef : undefined}
                      layout
                      key={conversation.conversationId}
                      type='button'
                      onHoverStart={() => setHoveredId(conversation.conversationId)}
                      onHoverEnd={() => setHoveredId(null)}
                      onClick={() => void handleConversation(conversation)}
                      animate={{ x: hoveredId === conversation.conversationId ? 4 : 0 }}
                      transition={SPRING}
                      className='group relative z-10 flex w-full items-center gap-3 rounded-[18px] p-2 text-left outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'
                    >
                      {hoveredId === conversation.conversationId && <motion.span layoutId='share-contact-hover' className='absolute inset-0 -z-10 rounded-[18px] border border-brand-ink/5 bg-secondary shadow-sm' transition={SPRING} />}
                      <span className='grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-blue/10 text-sm font-black text-brand-blue'>
                        {conversation.avatarUrl ? <img src={conversation.avatarUrl} alt='' className='h-full w-full object-cover' /> : initials(conversation.displayName)}
                      </span>
                      <span className='min-w-0'><span className='block truncate text-sm font-bold text-brand-ink'>{conversation.displayName}</span><span className='block text-xs text-muted-foreground'>{conversation.accountType === 'ngo' ? 'ONG' : 'Doador'}</span></span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key='targets' initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: reduceMotion ? 0.01 : 0.2 }}>
                <div className='flex items-center gap-2 px-2 pb-2 pt-1 text-xs font-bold text-muted-foreground'><Share2 size={14} aria-hidden='true' /> Compartilhar por</div>
                {SHARE_TARGETS.map((target, index) => {
                  const Icon = target.icon;
                  return <motion.button ref={index === 0 ? firstOptionRef : undefined} key={target.id} type='button' role='menuitem' onClick={() => void handleTarget(target)} className='group flex w-full items-center gap-3 rounded-[17px] px-2 py-2 text-left outline-none transition-colors hover:bg-secondary/75 focus-visible:bg-secondary/75' initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.22, delay: reduceMotion ? 0 : index * 0.035 }}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${target.iconClassName}`}><Icon size={21} aria-hidden='true' /></span><span className='min-w-0'><span className='block text-sm font-bold text-brand-ink'>{target.label}</span><span className='mt-0.5 block text-xs text-muted-foreground'>{target.description}</span></span></motion.button>;
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

  return (
    <div className='relative flex shrink-0 items-center justify-center'>
      <motion.button
        ref={triggerRef}
        type='button'
        aria-label='Compartilhar'
        aria-haspopup='menu'
        aria-expanded={panelVisible}
        onClick={() => setStatus((current) => current === 'idle' ? 'open' : panelVisible ? 'idle' : current)}
        className='relative grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-brand-blue text-white shadow-[0_7px_18px_rgba(55,181,247,0.28)] transition-colors hover:bg-brand-blue/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue'
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        transition={SPRING}
      >
        <AnimatePresence mode='popLayout' initial={false}>
          {status === 'idle' || panelVisible ? (
            <motion.span key='share' initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}><FiShare size={19} /></motion.span>
          ) : (
            <motion.span key='progress' initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className='relative grid h-9 w-9 place-items-center'>
              {status === 'sending' && <svg className='absolute inset-0 h-full w-full -rotate-90' aria-hidden='true'><circle cx='18' cy='18' r='16' fill='none' stroke='currentColor' strokeOpacity='0.14' strokeWidth='2' /><motion.circle cx='18' cy='18' r='16' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: [circumference, 0, circumference] }} transition={{ duration: reduceMotion ? 0.01 : 1.2, repeat: Infinity, ease: 'easeInOut' }} /></svg>}
              {status === 'success' ? <Check size={19} strokeWidth={2.7} /> : selectedConversation?.avatarUrl ? <img src={selectedConversation.avatarUrl} alt='' className='h-7 w-7 rounded-full object-cover' /> : <SelectedIcon size={17} />}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {panel}
      <span className='sr-only' aria-live='polite'>{status === 'success' ? selectedConversation ? `História enviada para ${selectedConversation.displayName}` : 'Compartilhamento concluído' : ''}</span>
    </div>
  );
};

export default StoryShareSheet;
