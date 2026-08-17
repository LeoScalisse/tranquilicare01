import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Instagram,
  MessageCircle,
  Send,
  Share2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
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
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Enviar em uma conversa',
    icon: MessageCircle,
    iconClassName: 'bg-[#DCF8E8] text-[#128C4A]',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Copiar para compartilhar',
    icon: Instagram,
    iconClassName: 'bg-[#FDE7EF] text-[#C13584]',
  },
  {
    id: 'tranquilicare',
    label: 'TranquiliCare',
    description: 'Enviar para outro usuário',
    icon: UsersRound,
    iconClassName: 'bg-[#DDF2FC] text-brand-blue',
  },
];

const SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 30,
  mass: 0.85,
} as const;

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

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
  const rootRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (status === 'open' && rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setStatus('idle');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && status === 'open') setStatus('idle');
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (status === 'open') window.requestAnimationFrame(() => firstOptionRef.current?.focus());
  }, [status]);

  const storyUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}#story-${storyId}`;

  const handleSelect = async (target: ShareTarget) => {
    const url = storyUrl();
    const message = `${storyTitle} - ${url}`;
    setSelectedTarget(target);
    setStatus('sending');

    try {
      if (target.id === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      } else if (target.id === 'instagram') {
        await copyText(url);
        toast.success('Link copiado para compartilhar no Instagram.');
      } else {
        await copyText(url);
        window.dispatchEvent(new CustomEvent('tranquilicare:share-story', {
          detail: { storyId, title: storyTitle, url },
        }));
        toast.success('Link copiado para enviar no TranquiliCare.');
      }
      setStatus('success');
    } catch {
      toast.error('Não foi possível preparar o compartilhamento.');
      setStatus('idle');
      setSelectedTarget(null);
      return;
    }

    resetTimerRef.current = window.setTimeout(() => {
      setStatus('idle');
      setSelectedTarget(null);
    }, reduceMotion ? 250 : 720);
  };

  const SelectedIcon = selectedTarget?.icon ?? Send;
  const circumference = 2 * Math.PI * 16;

  return (
    <div ref={rootRef} className='relative flex shrink-0 items-center justify-center'>
      <motion.button
        type='button'
        aria-label='Compartilhar'
        aria-haspopup='menu'
        aria-expanded={status === 'open'}
        onClick={() => setStatus((current) => current === 'open' ? 'idle' : current === 'idle' ? 'open' : current)}
        className='relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg transition-colors hover:bg-brand-blue/10 hover:text-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue'
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        transition={SPRING}
      >
        <AnimatePresence mode='popLayout' initial={false}>
          {status === 'idle' || status === 'open' ? (
            <motion.span key='share' initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <Send size={18} />
            </motion.span>
          ) : (
            <motion.span key='progress' initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className='relative grid h-9 w-9 place-items-center'>
              {status === 'sending' && (
                <svg className='absolute inset-0 h-full w-full -rotate-90' aria-hidden='true'>
                  <circle cx='18' cy='18' r='16' fill='none' stroke='currentColor' strokeOpacity='0.14' strokeWidth='2' />
                  <motion.circle
                    cx='18'
                    cy='18'
                    r='16'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: reduceMotion ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
              )}
              {status === 'success' ? <Check size={18} strokeWidth={2.5} /> : <SelectedIcon size={16} />}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence initial={false}>
        {status === 'open' && (
          <motion.div
            role='menu'
            aria-label='Compartilhar história por'
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.84, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 6 }}
            transition={SPRING}
            style={{ transformOrigin: '82% 100%' }}
            className='absolute bottom-[calc(100%+0.75rem)] right-[-5rem] z-30 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-white/65 bg-background/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_24px_60px_-30px_rgba(15,36,60,0.72)] backdrop-blur-xl sm:right-0'
          >
            <div className='flex items-center gap-2 px-2 pb-2 pt-1 text-xs font-bold text-muted-foreground'>
              <Share2 size={14} aria-hidden='true' /> Compartilhar por
            </div>
            {SHARE_TARGETS.map((target, index) => {
              const Icon = target.icon;
              return (
                <motion.button
                  ref={index === 0 ? firstOptionRef : undefined}
                  key={target.id}
                  type='button'
                  role='menuitem'
                  onClick={() => void handleSelect(target)}
                  className='group flex w-full items-center gap-3 rounded-[16px] px-2 py-2 text-left outline-none transition-colors hover:bg-secondary/75 focus-visible:bg-secondary/75'
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: reduceMotion ? 0 : index * 0.035 }}
                  whileHover={reduceMotion ? undefined : { x: -3 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${target.iconClassName}`}>
                    <Icon size={21} aria-hidden='true' />
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-sm font-bold text-brand-ink'>{target.label}</span>
                    <span className='mt-0.5 block text-xs text-muted-foreground'>{target.description}</span>
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <span className='sr-only' aria-live='polite'>{status === 'success' ? `Compartilhamento preparado para ${selectedTarget?.label}` : ''}</span>
    </div>
  );
};

export default StoryShareSheet;
