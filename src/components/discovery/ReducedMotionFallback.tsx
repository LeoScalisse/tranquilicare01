import React from 'react';
import { useReducedMotion } from 'framer-motion';

interface ReducedMotionFallbackProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ReducedMotionFallback: React.FC<ReducedMotionFallbackProps> = ({ children, fallback }) => {
  const reducedMotion = useReducedMotion();
  return <>{reducedMotion && fallback ? fallback : children}</>;
};

export default ReducedMotionFallback;
