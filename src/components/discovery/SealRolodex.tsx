import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { verificationSeals } from '@/data/verificationSeals';

interface SealRolodexProps {
  id: string;
  opening?: boolean;
  onActivate: () => void;
  onPreload?: () => void;
}

const ROTATION_DELAY_MS = 4200;
const FLIP_DURATION_MS = 1200;
const HALF_FLIP_SECONDS = FLIP_DURATION_MS / 2000;

const sealThemes: Record<string, string> = {
  ambiente: 'border-green-200 bg-green-100 text-green-800',
  educacao: 'border-blue-200 bg-blue-100 text-blue-800',
  pets: 'border-orange-200 bg-orange-100 text-orange-800',
  'saude-mental': 'border-[#F4C44E] bg-[#FFF7D6] text-[#9C6500]',
  saude: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  social: 'border-violet-200 bg-violet-100 text-violet-800',
};

const items = [
  { id: 'verified', label: 'ONGs verificadas com cuidado', src: null },
  ...verificationSeals,
];

interface FlipState {
  from: number;
  to: number;
  sequence: number;
}

const RolodexFace: React.FC<{ item: (typeof items)[number] }> = ({ item }) => {
  if (!item.src) {
    return (
      <span className='flex h-12 w-[252px] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#B8E2FA] bg-[#EAF7FF] px-4 text-xs font-bold text-brand-ink'>
        <ShieldCheck size={17} className='shrink-0 text-brand-blue' aria-hidden='true' />
        <span>ONGs verificadas com cuidado</span>
        <ArrowRight size={14} className='shrink-0 text-brand-blue' aria-hidden='true' />
      </span>
    );
  }

  return (
    <span className={`flex h-12 w-[252px] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-xs font-bold ${sealThemes[item.id]}`}>
      <img src={item.src} alt='' className='h-11 w-11 shrink-0 object-contain' />
      <span>{item.label}</span>
      <ArrowRight size={14} className='shrink-0' aria-hidden='true' />
    </span>
  );
};

const SealRolodex: React.FC<SealRolodexProps> = ({
  id,
  opening = false,
  onActivate,
  onPreload,
}) => {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState<FlipState | null>(null);
  const currentIndexRef = useRef(0);
  const flippingRef = useRef(false);
  const sequenceRef = useRef(0);
  const flipTimeoutRef = useRef<number>();

  useEffect(() => {
    if (reducedMotion) {
      currentIndexRef.current = 0;
      flippingRef.current = false;
      setIndex(0);
      setFlip(null);
      return;
    }

    const interval = window.setInterval(() => {
      if (flippingRef.current) return;

      const from = currentIndexRef.current;
      const to = (from + 1) % items.length;
      sequenceRef.current += 1;
      flippingRef.current = true;
      setFlip({ from, to, sequence: sequenceRef.current });

      flipTimeoutRef.current = window.setTimeout(() => {
        currentIndexRef.current = to;
        setIndex(to);
        setFlip(null);
        flippingRef.current = false;
      }, FLIP_DURATION_MS);
    }, ROTATION_DELAY_MS);

    return () => {
      window.clearInterval(interval);
      if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
      flippingRef.current = false;
    };
  }, [reducedMotion]);

  const activeItem = items[(flip?.to ?? index) % items.length];
  const previousItem = flip ? items[flip.from % items.length] : null;

  return (
    <motion.button
      id={id}
      type='button'
      onClick={onActivate}
      onPointerEnter={onPreload}
      onFocus={onPreload}
      animate={{ scale: opening ? 0.97 : 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className='group relative h-14 w-[268px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-4'
      aria-label='Descobrir como o TranquiliCare verifica as ONGs'
    >
      <span className='sr-only'>Abrir Como verificamos as ONGs</span>
      <span
        aria-hidden='true'
        className='absolute left-1/2 top-1/2 h-12 w-[252px]'
        style={{
          transform: 'translate(-50%, -50%) rotateY(-8deg)',
          transformStyle: 'preserve-3d',
          perspective: '700px',
        }}
      >
        <span
          className='absolute left-1/2 top-1/2 z-0 block'
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <RolodexFace item={activeItem} />
        </span>

        {flip && previousItem && (
          <React.Fragment key={flip.sequence}>
            <span
              className='absolute left-1/2 top-1/2 z-20 block'
              style={{
                transform: 'translate(-50%, -50%)',
                clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
                backfaceVisibility: 'hidden',
              }}
            >
              <RolodexFace item={previousItem} />
            </span>

            <motion.span
              className='absolute left-1/2 top-1/2 z-30 block'
              style={{
                x: '-50%',
                y: '-50%',
                clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
                transformOrigin: '50% 50%',
                backfaceVisibility: 'hidden',
              }}
              initial={{ rotateX: 0 }}
              animate={{ rotateX: -90 }}
              transition={{
                duration: HALF_FLIP_SECONDS,
                ease: [0.4, 0, 1, 1],
              }}
            >
              <RolodexFace item={previousItem} />
            </motion.span>

            <motion.span
              className='absolute left-1/2 top-1/2 z-40 block'
              style={{
                x: '-50%',
                y: '-50%',
                clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
                transformOrigin: '50% 50%',
                backfaceVisibility: 'hidden',
              }}
              initial={{ rotateX: 90 }}
              animate={{ rotateX: 0 }}
              transition={{
                delay: HALF_FLIP_SECONDS,
                duration: HALF_FLIP_SECONDS,
                ease: [0, 0, 0.2, 1],
              }}
            >
              <RolodexFace item={activeItem} />
            </motion.span>
          </React.Fragment>
        )}

        <span
          className='absolute inset-x-0 top-1/2 z-50 h-px -translate-y-1/2 bg-brand-ink/10'
          style={{ transform: 'translateY(-50%) translateZ(1px)' }}
        />
      </span>
    </motion.button>
  );
};

export default SealRolodex;
