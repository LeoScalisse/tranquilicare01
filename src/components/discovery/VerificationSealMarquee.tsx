import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { verificationSeals } from '@/data/verificationSeals';
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from '@/components/ui/marquee';

interface VerificationSealMarqueeProps {
  onSealSelect?: (sealId: string) => void;
}

const VerificationSealMarquee: React.FC<VerificationSealMarqueeProps> = ({ onSealSelect }) => {
  const reducedMotion = useReducedMotion();

  return (
    <div className='w-full' aria-label='Selos de áreas verificadas pelo TranquiliCare'>
      <p className='sr-only'>{verificationSeals.map((seal) => seal.label).join(', ')}</p>
      <Marquee className='py-8 sm:py-12'>
        <MarqueeFade side='left' className='from-brand-blue' />
        <MarqueeFade side='right' className='from-brand-blue' />
        <MarqueeContent
          speed={reducedMotion ? 0 : 22}
          play={!reducedMotion}
          gradient={false}
          pauseOnClick
        >
          {verificationSeals.map((seal) => (
            <MarqueeItem key={seal.id} className='h-32 w-32 sm:h-44 sm:w-44 lg:h-52 lg:w-52'>
              <button
                type='button'
                onClick={() => onSealSelect?.(seal.id)}
                className='h-full w-full rounded-full transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-4 focus-visible:ring-offset-brand-blue'
                aria-label={`Ver impacto em ${seal.label}`}
              >
                <img
                  src={seal.src}
                  alt=''
                  className='h-full w-full object-contain drop-shadow-[0_14px_24px_rgba(17,54,79,0.13)]'
                />
              </button>
            </MarqueeItem>
          ))}
        </MarqueeContent>
      </Marquee>
    </div>
  );
};

export default VerificationSealMarquee;
