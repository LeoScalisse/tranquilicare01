import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { VerificationSeal } from '@/data/verificationSeals';

interface SealImpactPopoverProps {
  seal: VerificationSeal | null;
  onClose: () => void;
}

const SealImpactPopover: React.FC<SealImpactPopoverProps> = ({ seal, onClose }) => {
  const reducedMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!seal) return;
    closeRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, seal]);

  return (
    <AnimatePresence>
      {seal && (
        <>
          <motion.button
            type='button'
            aria-label='Fechar informações do selo'
            className='fixed inset-0 z-[78] cursor-default bg-brand-ink/10'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className='pointer-events-none fixed inset-x-4 bottom-4 z-[79] flex justify-center sm:inset-x-6 sm:bottom-7'>
            <motion.aside
              role='dialog'
              aria-modal='false'
              aria-labelledby='seal-popover-title'
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className='pointer-events-auto relative w-full max-w-[34rem] rounded-xl border border-border bg-background p-5 text-left shadow-[0_24px_80px_rgba(12,45,67,0.24)] sm:p-6'
            >
              <div className='flex items-start gap-4'>
                <img src={seal.src} alt='' className='h-20 w-20 shrink-0 rounded-lg object-contain sm:h-24 sm:w-24' />
                <div className='min-w-0 flex-1 pr-8'>
                  <p className='text-xs font-bold uppercase text-brand-blue'>Impacto acompanhado</p>
                  <h2 id='seal-popover-title' className='mt-1 text-xl font-bold text-brand-ink'>{seal.label}</h2>
                  <p className='mt-3 text-2xl font-extrabold text-brand-ink'>{seal.impact}</p>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>{seal.detail}</p>
                </div>
                <button
                  ref={closeRef}
                  type='button'
                  onClick={onClose}
                  className='absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-secondary text-brand-blue transition-colors hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2'
                  aria-label='Fechar'
                >
                  <X size={18} />
                </button>
              </div>
            </motion.aside>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SealImpactPopover;
