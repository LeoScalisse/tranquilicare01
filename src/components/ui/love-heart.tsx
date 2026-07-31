import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface LoveHeartProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible label (e.g. "Salvar nos favoritos") */
  label?: string;
  /** Icon size in px */
  size?: number;
}

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const PINK = '#f43f6e';
const PINK_SOFT = '#ffa5bd';
const PARTICLES = 10;

/**
 * Animated like / favourite heart.
 *
 * Mechanics are unchanged (controlled checkbox-style toggle), but the feedback
 * is the delightful part: the heart gives a restrained pulse, an
 * energy ring expands outward, and a ring of particles bursts and fades.
 * The burst only fires on the false -> true transition, so cards that load
 * already-favourited stay quiet. Honours prefers-reduced-motion.
 */
const LoveHeart: React.FC<LoveHeartProps> = ({ checked, onChange, label, size = 26 }) => {
  const reduced = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);
  const prevChecked = useRef(checked);

  useEffect(() => {
    if (!prevChecked.current && checked) setBurstKey((k) => k + 1); // only on like
    prevChecked.current = checked;
  }, [checked]);

  const showBurst = burstKey > 0 && checked && !reduced;

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      aria-pressed={checked}
      aria-label={label}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid h-10 w-10 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      {/* Expanding energy ring — behind the heart, fires once per like */}
      {showBurst && (
        <motion.span
          key={`ring-${burstKey}`}
          style={{ gridArea: '1 / 1', borderColor: PINK }}
          className="pointer-events-none absolute rounded-full border-[3px]"
          initial={{ width: 8, height: 8, opacity: 0.9 }}
          animate={{ width: size * 2.3, height: size * 2.3, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      {/* Soft glow behind a liked heart */}
      <motion.span
        style={{ gridArea: '1 / 1', background: PINK }}
        className="pointer-events-none absolute rounded-full blur-md"
        initial={false}
        animate={{
          opacity: checked ? 0.35 : 0,
          width: checked ? size * 0.9 : 0,
          height: checked ? size * 0.9 : 0,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* The heart itself: a short pulse keeps the feedback clear and calm. */}
      <motion.svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        initial={false}
        animate={reduced ? { scale: 1 } : { scale: checked ? [1, 0.9, 1.1, 1] : 1 }}
        transition={
          checked && !reduced
            ? { duration: 0.42, times: [0, 0.22, 0.56, 1], ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
      >
        <motion.path
          d={HEART_PATH}
          strokeWidth={2}
          strokeLinejoin="round"
          initial={false}
          animate={{
            fill: checked ? PINK : 'rgba(0,0,0,0.22)',
            stroke: checked ? PINK : '#ffffff',
          }}
          transition={{ duration: 0.25 }}
        />
      </motion.svg>

      {/* Particle burst — ON TOP so the dots clearly fly out past the heart */}
      {showBurst && (
        <span key={`burst-${burstKey}`} className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          {Array.from({ length: PARTICLES }).map((_, i) => {
            const angle = (i / PARTICLES) * Math.PI * 2 + (i % 2) * 0.28;
            const dist = size * (1.15 + (i % 3) * 0.12);
            const dot = 4 + (i % 3);
            return (
              <motion.span
                key={i}
                style={{ gridArea: '1 / 1', background: i % 2 === 0 ? PINK : PINK_SOFT, width: dot, height: dot }}
                className="rounded-full"
                initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  scale: [0.2, 1, 0.2],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              />
            );
          })}
        </span>
      )}
    </motion.button>
  );
};

export default LoveHeart;
