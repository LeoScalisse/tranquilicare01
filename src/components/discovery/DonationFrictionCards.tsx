import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

const cardLabels = ['Interesseiros', 'Descontos', 'Custos'];

interface FrictionCardProps {
  index: number;
  activeIndex: number;
  onAdvance: (direction: 1 | -1) => void;
  onInteract: () => void;
}

const FrictionCard: React.FC<FrictionCardProps> = ({
  index,
  activeIndex,
  onAdvance,
  onInteract,
}) => {
  const x = useMotionValue(0);
  const dragRotate = useTransform(x, [-150, 150], [-9, 9]);
  const dragOpacity = useTransform(x, [-180, 0, 180], [0.4, 1, 0.4]);
  const rank = (index - activeIndex + cardLabels.length) % cardLabels.length;
  const isFront = rank === 0;
  const stackOffset = rank === 1 ? 13 : rank === 2 ? -13 : 0;
  const stackTone = rank === 0 ? '#38bdf8' : rank === 1 ? '#2daee4' : '#219ed2';

  useEffect(() => {
    if (!isFront) x.set(0);
  }, [isFront, x]);

  return (
    <motion.div
      className='absolute grid h-52 w-[min(78vw,22rem)] origin-bottom place-items-center rounded-lg border border-white/20 px-6 text-center text-4xl font-bold text-white sm:h-64 sm:text-5xl'
      style={{
        zIndex: cardLabels.length - rank,
        x: isFront ? x : stackOffset,
        rotate: isFront ? dragRotate : rank % 2 ? 3 : -3,
        opacity: isFront ? dragOpacity : 1,
        pointerEvents: isFront ? 'auto' : 'none',
        backgroundColor: stackTone,
        boxShadow: isFront
          ? '0 24px 55px rgba(12,102,148,0.28)'
          : `0 ${12 + rank * 4}px ${28 + rank * 6}px rgba(12,78,112,${0.18 - rank * 0.03})`,
      }}
      animate={{
        y: rank * 16,
        scale: 1 - rank * 0.055,
      }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      drag={isFront ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      dragMomentum={false}
      onPointerDown={onInteract}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 50) {
          onAdvance(info.offset.x < 0 ? 1 : -1);
        }
      }}
    >
      {cardLabels[index]}
    </motion.div>
  );
};

const DonationFrictionCards: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [timerVersion, setTimerVersion] = useState(0);

  const advance = (direction: 1 | -1) => {
    setActiveIndex((current) =>
      (current + direction + cardLabels.length) % cardLabels.length,
    );
    setTimerVersion((version) => version + 1);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % cardLabels.length);
      setTimerVersion((version) => version + 1);
    }, 5_000);
    return () => window.clearTimeout(timer);
  }, [timerVersion]);

  return (
    <div className='relative grid min-h-[24rem] w-full place-items-center sm:min-h-[28rem]'>
      <div
        className='absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-3 sm:top-5'
        role='tablist'
        aria-label='Itens que podem reduzir o valor recebido'
      >
        {cardLabels.map((label, index) => (
          <button
            key={label}
            type='button'
            role='tab'
            aria-selected={activeIndex === index}
            aria-label={`Mostrar ${label}`}
            onClick={() => {
              setActiveIndex(index);
              setTimerVersion((version) => version + 1);
            }}
            className={`h-2.5 w-2.5 rounded-full border transition-[background-color,border-color,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-4 ${
              activeIndex === index
                ? 'scale-110 border-brand-blue bg-brand-blue'
                : 'border-brand-blue/45 bg-brand-blue/15 hover:bg-brand-blue/30'
            }`}
          />
        ))}
      </div>
      {cardLabels.map((_, index) => (
        <FrictionCard
          key={cardLabels[index]}
          index={index}
          activeIndex={activeIndex}
          onAdvance={advance}
          onInteract={() => setTimerVersion((version) => version + 1)}
        />
      ))}
    </div>
  );
};

export default DonationFrictionCards;
