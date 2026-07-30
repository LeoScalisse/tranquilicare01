import React from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from '@/components/ui/marquee';

const amounts = ['R$ 20', 'R$ 50', 'R$ 100', 'R$ 250', 'R$ 500'];

const DonationAmountMarquee: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div className='w-full' aria-label='Exemplos de valores escolhidos para doação'>
      <Marquee className='py-10 sm:py-14'>
        <MarqueeFade side='left' className='from-brand-blue' />
        <MarqueeFade side='right' className='from-brand-blue' />
        <MarqueeContent
          speed={reducedMotion ? 0 : 24}
          play={!reducedMotion}
          gradient={false}
          pauseOnHover
        >
          {amounts.map((amount) => (
            <MarqueeItem key={amount} className='mx-3 sm:mx-5'>
              <span className='inline-flex min-h-24 min-w-48 items-center justify-center rounded-full border border-white/25 bg-background/[0.12] px-10 font-display text-4xl font-semibold text-white shadow-[0_18px_50px_rgba(8,55,91,0.16)] backdrop-blur sm:min-h-32 sm:min-w-60 sm:text-5xl'>
                {amount}
              </span>
            </MarqueeItem>
          ))}
        </MarqueeContent>
      </Marquee>
    </div>
  );
};

export default DonationAmountMarquee;
