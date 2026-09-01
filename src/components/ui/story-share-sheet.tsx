import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Instagram, MessageCircle, Share2, UsersRound, type LucideIcon } from 'lucide-react';
import { FiShare } from 'react-icons/fi';
import { toast } from 'sonner';

type ShareStatus = 'idle' | 'open' | 'sending' | 'success';
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
  { id: 'instagram', label: 'Instagram', description: 'Copiar para compartilhar', icon: Instagram, iconClassName: 'bg-[#FDE7EF] text-[#C13584]' },
  { id: 'tranquilicare', label: 'TranquiliCare', description: 'Copiar para enviar', icon: UsersRound, iconClassName: 'bg-[#DDF2FC] text-brand-blue' },
];

const SPRING = { type: 'spring', stiffness: 240, damping: 20, mass: 1 } as const;
const SUCCESS_DURATION_MS = 2000;
const PANEL_WIDTH = 288;
const PANEL_HEIGHT = 246;
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

export const StoryShareSheet: React.FC<StoryShareSheetProps> = ({ storyId, storyTitle }) => {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [selectedTarget, setSelectedTarget] = useState<ShareTarget | null>(null);
  const [panelPosition, setPanelPosition] = useState({ left: VIEWPORT_GAP, top: VIEWPORT_GAP, origin: 'bottom right' });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const resetTimerRef = useRef<number | null>(null);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
    const left = Math.min(Math.max(VIEWPORT_GAP, rect.right - width), window.innerWidth - width - VIEWPORT_GAP);
    const fitsAbove = rect.top - PANEL_HEIGHT - VIEWPORT_GAP >= VIEWPORT_GAP;
    setPanelPosition({ left, top: fitsAbove ? rect.top - PANEL_HEIGHT - VIEWPORT_GAP : rect.bottom + VIEWPORT_GAP, origin: fitsAbove ? 'bottom right' : 'top right' });
  }, []);

  useEffect(() => {
    if (status !== 'open') return undefined;
    updatePanelPosition();
    window.requestAnimationFrame(() => firstOptionRef.current?.focus());
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [status, updatePanelPosition]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (status === 'open' && !triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setStatus('idle');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && status === 'open') {
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
  }, [status]);

  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
  }, []);

  const storyUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}#story-${storyId}`;

  const handleSelect = async (target: ShareTarget) => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    const url = storyUrl();
    const message = `${storyTitle} - ${url}`;
    setSelectedTarget(target);
    setStatus('sending');
    try {
      if (target.id === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      } else {
        await copyText(url);
        if (target.id === 'tranquilicare') {
          window.dispatchEvent(new CustomEvent('tranquilicare:share-story', { detail: { storyId, title: storyTitle, url } }));
        }
        toast.success('Link copiado.');
      }
      setStatus('success');
      resetTimerRef.current = window.setTimeout(() => {
        setStatus('idle');
        setSelectedTarget(null);
      }, SUCCESS_DURATION_MS);
    } catch {
      toast.error('Não foi possível preparar o compartilhamento.');
      setStatus('idle');
      setSelectedTarget(null);
    }
  };

  const SelectedIcon = selectedTarget?.icon ?? Share2;
  const circumference = 2 * Math.PI * 16;

  const panel = typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence initial={false}>
        {status === 'open' && <motion.div
          ref={panelRef}
          role='menu'
          aria-label='Compartilhar história por'
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 5 }}
          transition={reduceMotion ? { duration: 0.01 } : SPRING}
          style={{ left: panelPosition.left, top: panelPosition.top, transformOrigin: panelPosition.origin }}
          className='fixed z-[170] w-[min(18rem,calc(100vw-1.5rem))] rounded-[24px] border border-white/70 bg-background/95 p-2 shadow-[0_24px_70px_-24px_rgba(15,36,60,0.55)] backdrop-blur-xl'
        >
          <div className='flex items-center gap-2 px-2 pb-2 pt-1 text-xs font-bold text-muted-foreground'><Share2 size={14} aria-hidden='true' /> Compartilhar por</div>
          {SHARE_TARGETS.map((target, index) => {
            const Icon = target.icon;
            return (
              <motion.button
                ref={index === 0 ? firstOptionRef : undefined}
                key={target.id}
                type='button'
                role='menuitem'
                onClick={() => void handleSelect(target)}
                className='group flex w-full items-center gap-3 rounded-[17px] px-2 py-2 text-left outline-none transition-colors hover:bg-secondary/75 focus-visible:bg-secondary/75'
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.22, delay: reduceMotion ? 0 : index * 0.035 }}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${target.iconClassName}`}><Icon size={21} aria-hidden='true' /></span>
                <span className='min-w-0'><span className='block text-sm font-bold text-brand-ink'>{target.label}</span><span className='mt-0.5 block text-xs text-muted-foreground'>{target.description}</span></span>
              </motion.button>
            );
          })}
        </motion.div>}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <div className='relative flex shrink-0 items-center justify-center'>
      <motion.button
        ref={triggerRef}
        type='button'
        aria-label='Compartilhar'
        aria-haspopup='menu'
        aria-expanded={status === 'open'}
        onClick={() => setStatus((current) => current === 'open' ? 'idle' : current === 'idle' ? 'open' : current)}
        className='relative grid h-10 w-10 place-items-center overflow-hidden rounded-[14px] transition-colors hover:bg-brand-blue/10 hover:text-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue'
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        transition={SPRING}
      >
        <AnimatePresence mode='popLayout' initial={false}>
          {status === 'idle' || status === 'open' ? (
            <motion.span key='share' initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}><FiShare size={19} /></motion.span>
          ) : (
            <motion.span key='progress' initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className='relative grid h-9 w-9 place-items-center'>
              {status === 'sending' && <svg className='absolute inset-0 h-full w-full -rotate-90' aria-hidden='true'><circle cx='18' cy='18' r='16' fill='none' stroke='currentColor' strokeOpacity='0.14' strokeWidth='2' /><motion.circle cx='18' cy='18' r='16' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.45 }} /></svg>}
              {status === 'success' ? <Check size={19} strokeWidth={2.7} /> : <SelectedIcon size={17} />}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {panel}
      <span className='sr-only' aria-live='polite'>{status === 'success' ? 'Compartilhamento preparado' : ''}</span>
    </div>
  );
};

export default StoryShareSheet;
