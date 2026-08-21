import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import './apple-edge-glow.css';

type GlowIntensity = 'sm' | 'md' | 'lg' | 'xl';

interface AppleEdgeGlowProps {
  preview?: boolean;
  intensity?: GlowIntensity;
  className?: string;
}

const edges = ['top', 'right', 'bottom', 'left'] as const;
const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const;

export const AppleEdgeGlow: React.FC<AppleEdgeGlowProps> = ({
  preview = false,
  intensity = 'xl',
  className,
}) => {
  const reduceMotion = useReducedMotion();

  if (!preview) return null;

  return (
    <motion.div
      aria-hidden='true'
      data-intensity={intensity}
      className={cn('apple-edge-glow', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className='apple-edge-glow__rim' />
      <span className='apple-edge-glow__surface'>
        {edges.map((edge) => <span key={edge} className={`apple-edge-glow__edge apple-edge-glow__edge--${edge}`} />)}
        {corners.map((corner) => <span key={corner} className={`apple-edge-glow__corner apple-edge-glow__corner--${corner}`} />)}
      </span>
    </motion.div>
  );
};

export default AppleEdgeGlow;
