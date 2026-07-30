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

  useEffect(() => {
    if (!isFront) x.set(0);
  }, [isFront, x]);

  return (
    <motion.div
      className='absolute grid h-52 w-[min(78vw,22rem)] origin-bottom place-items-center rounded-lg bg-brand-blue px-6 text-center text-4xl font-bold text-white shadow-[0_24px_55px_rgba(12,102,148,0.28)] sm:h-64 sm:text-5xl'
      style={{
        zIndex: cardLabels.length - rank,
        x: isFront ? x : 0,
        rotate: isFront ? dragRotate : rank % 2 ? 3 : -3,
        opacity: isFront ? dragOpacity : 1,
        pointerEvents: isFront ? 'auto' : 'none',
      }}
      animate={{
        y: rank * 9,
        scale: 1 - rank * 0.035,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
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
    <div className='relative grid min-h-[19rem] w-full place-items-center sm:min-h-[23rem]'>
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
