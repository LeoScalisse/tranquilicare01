import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface Props {
  active: boolean;
  amountCents: number;
  celebrationKey: string | null;
  onValueRelease: () => void;
  onComplete: () => void;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const DonationCardCelebration: React.FC<Props> = ({
  active,
  celebrationKey,
  onValueRelease,
  onComplete,
}) => {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const releaseTimer = window.setTimeout(onValueRelease, reducedMotion ? 80 : 1380);
    const completeTimer = window.setTimeout(onComplete, reducedMotion ? 220 : 1950);
    return () => {
      window.clearTimeout(releaseTimer);
      window.clearTimeout(completeTimer);
    };
  }, [active, celebrationKey, onComplete, onValueRelease, reducedMotion]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={celebrationKey}
          className='pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl'
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden='true'
        >
          <motion.div
            className='absolute inset-0 bg-brand-yellow'
            style={{ transformOrigin: '50% 50%' }}
            initial={{ clipPath: 'circle(14px at 50% 50%)', opacity: 1 }}
            animate={{
              clipPath: [
                'circle(14px at 50% 50%)',
                'circle(150% at 50% 50%)',
                'circle(150% at 50% 50%)',
                'circle(150% at 50% 50%)',
              ],
              opacity: [1, 1, 0.96, 0],
            }}
            transition={{
              duration: reducedMotion ? 0.18 : 1.35,
              times: [0, 0.34, 0.66, 1],
              ease: EASE_OUT,
            }}
          />

          <motion.div
            className='absolute left-1/2 top-1/2 h-7 w-7 rounded-full border border-white/75'
            style={{ translate: '-50% -50%' }}
            initial={{ opacity: 0.8, scale: 0.7 }}
            animate={{ opacity: [0.8, 0], scale: [0.7, 5.5] }}
            transition={{ duration: reducedMotion ? 0.08 : 0.72, ease: EASE_OUT }}
          />

          <motion.div
            className='absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.28)_48%,transparent_66%)]'
            initial={{ x: '-110%', opacity: 0 }}
            animate={{ x: ['-110%', '110%'], opacity: [0, 0.75, 0] }}
            transition={{ duration: reducedMotion ? 0.1 : 0.9, delay: reducedMotion ? 0 : 0.36, ease: EASE_OUT }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DonationCardCelebration;
