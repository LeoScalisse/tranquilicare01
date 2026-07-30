import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import type { AnimationItem } from 'lottie-web';

/**
 * Rotating hero headline for the logged-out home. Three phrases, each with
 * its own inner choreography after the word-by-word reveal:
 *  1. "100%" fills with yellow liquid; then a yellow droplet drips out of it
 *     and hops word by word (each word flashes yellow under the droplet and
 *     returns to ink) until it merges into "ONG", which stays yellow —
 *     the 100% literally arriving at the NGO.
 *  2. "verificada" shrinks away and a Lottie check
 *     (public/check-recolored.json) takes its place; siblings reflow gently.
 *  3. Yellow travels through the sentence: "com a sua cara" lights up, then
 *     the light passes THROUGH the connector "e" (flash only) and settles
 *     permanently on "mude o mundo".
 */

type Role = 'fill' | 'drop' | 'target' | 'check' | 'hl1' | 'bridge' | 'hl2';

interface Token {
  text: string;
  role?: Role;
}

const PHRASES: Token[][] = [
  [
    { text: '100%', role: 'fill' },
    { text: 'da', role: 'drop' },
    { text: 'sua', role: 'drop' },
    { text: 'doação', role: 'drop' },
    { text: 'chega', role: 'drop' },
    { text: 'na', role: 'drop' },
    { text: 'ONG', role: 'target' },
  ],
  [
    { text: 'Aqui' },
    { text: 'cada' },
    { text: 'ONG' },
    { text: 'é' },
    { text: 'verificada', role: 'check' },
    { text: 'de' },
    { text: 'perto' },
  ],
  [
    { text: 'Encontre' },
    { text: 'a' },
    { text: 'causa' },
    { text: 'com', role: 'hl1' },
    { text: 'a', role: 'hl1' },
    { text: 'sua', role: 'hl1' },
    { text: 'cara', role: 'hl1' },
    { text: 'e', role: 'bridge' },
    { text: 'mude', role: 'hl2' },
    { text: 'o', role: 'hl2' },
    { text: 'mundo', role: 'hl2' },
  ],
];

// Per-phrase hold (after reveal completes). Phrase 1 needs extra room:
// ~4s of liquid fill + ~5s of droplet journey + reading time.
const PHRASE_HOLDS = [11_500, 10_000, 10_000];

const CHECK_DELAY_MS = 2_000; // "verificada" -> check swap
const CHECK_SETTLE_MS = 2_500; // width shift, check draw and halo finish
const HL1_DELAY_MS = 400; // yellow lights up "com a sua cara"
const HL2_DELAY_MS = 5_000; // light starts traveling to "mude o mundo"

// Droplet journey (phrase 1), relative to reveal completion. The whole
// journey is ONE continuous keyframe animation (built in buildJourney), so
// the hops flow smoothly with no per-hop state churn.
const DROPLET_START_MS = 4_400; // fill (0.1 delay + 4s) done -> droplet drips out
const DROPLET_TARGET_INDEX = 6; // "ONG"
const HOP_APPEAR = 0.5; // s — droplet pops out of "100%"
const HOP_FLIGHT = 0.5; // s — airborne arc between words
const HOP_REST = 0.2; // s — soft landing pause on each word
const HOP_ABSORB = 0.45; // s — final dive into "ONG"
const JOURNEY_DURATION = HOP_APPEAR + DROPLET_TARGET_INDEX * (HOP_FLIGHT + HOP_REST) + HOP_ABSORB;

interface Journey {
  size: number;
  x: number[];
  xT: number[];
  y: number[];
  yT: number[];
  yEase: Array<'linear' | 'easeOut' | 'easeIn'>;
  o: number[];
  oT: number[];
  s: number[];
  sy: number[];
  sx: number[];
  sqT: number[];
}

const INK = 'hsl(210, 55%, 18%)'; // --brand-blue-deep, for animatable color values
const YELLOW = '#ffde59';

const phraseLabel = (tokens: Token[]) => tokens.map((t) => t.text).join(' ');

/**
 * Liquid-fill for "100%" (CSS liquid-button technique): a sine-wave SVG mask
 * slides across the glyphs — the surface flows sideways while the level
 * rises, with a lighter crest layer leading the main body.
 */
const WAVE_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 800' preserveAspectRatio='none'%3E%3Cpath d='M0 100 C33 84 66 84 100 100 C133 116 166 116 200 100 C233 84 266 84 300 100 C333 116 366 116 400 100 L400 800 L0 800 Z' fill='black'/%3E%3C/svg%3E")`;

const FILL_DURATION = 4;
const FILL_STEPS = 32;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

const liquidKeyframes = (targetY: number, flow: number, phase: number) =>
  Array.from({ length: FILL_STEPS + 1 }, (_, i) => {
    const t = i / FILL_STEPS;
    const y = targetY * smoothstep(t);
    const x = phase - 133.33 * flow * t;
    return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
  });

const MAIN_FILL = liquidKeyframes(18, 1.4, 0);
const CREST_FILL = liquidKeyframes(19.6, 1.9, -55);

const maskStyle: React.CSSProperties = {
  WebkitMaskImage: WAVE_MASK,
  maskImage: WAVE_MASK,
  WebkitMaskSize: '400% 800%',
  maskSize: '400% 800%',
  WebkitMaskRepeat: 'repeat-x',
  maskRepeat: 'repeat-x',
};

const FillWord: React.FC<{ text: string; active: boolean; reduce: boolean }> = ({ text, active, reduce }) => {
  if (reduce) {
    return <span className="text-brand-yellow">{text}</span>;
  }
  return (
    <motion.span
      className="relative inline-block"
      animate={
        active
          ? {
              rotate: [0, -0.5, 0.4, -0.35, 0.3, -0.2, 0.15, 0],
              x: [0, -0.8, 0.6, -0.5, 0.4, -0.3, 0.2, 0],
            }
          : { rotate: 0, x: 0 }
      }
      transition={{ duration: FILL_DURATION, delay: 0.1, ease: 'easeInOut' }}
    >
      <span className="text-brand-ink/20">{text}</span>
      {/* brighter crest layer, leading the surface */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 text-[#ffeb99]"
        style={maskStyle}
        initial={{ WebkitMaskPosition: CREST_FILL[0], maskPosition: CREST_FILL[0] }}
        animate={
          active
            ? { WebkitMaskPosition: CREST_FILL, maskPosition: CREST_FILL }
            : { WebkitMaskPosition: CREST_FILL[0], maskPosition: CREST_FILL[0] }
        }
        transition={{ duration: FILL_DURATION, delay: 0.1, ease: 'linear' }}
      >
        {text}
      </motion.span>
      {/* main liquid body */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 text-brand-yellow"
        style={maskStyle}
        initial={{ WebkitMaskPosition: MAIN_FILL[0], maskPosition: MAIN_FILL[0] }}
        animate={
          active
            ? { WebkitMaskPosition: MAIN_FILL, maskPosition: MAIN_FILL }
            : { WebkitMaskPosition: MAIN_FILL[0], maskPosition: MAIN_FILL[0] }
        }
        transition={{ duration: FILL_DURATION, delay: 0.1, ease: 'linear' }}
      >
        {text}
      </motion.span>
    </motion.span>
  );
};

/** A word along the droplet's path: yellow while the droplet sits on it,
 *  back to ink when it leaves; the target ("ONG") keeps the yellow. */
const DropWord: React.FC<{ text: string; lit: boolean; merged: boolean }> = ({ text, lit, merged }) => (
  <motion.span
    className="inline-block"
    initial={{ color: INK }}
    animate={{ color: lit ? YELLOW : INK, scale: merged ? [1, 1.07, 1] : 1 }}
    transition={{ color: { duration: 0.28, ease: 'easeOut' }, scale: { duration: 0.5, ease: 'easeOut' } }}
  >
    {text}
  </motion.span>
);

/** Traveling emphasis: the word's own text color turns yellow. */
const HighlightWord: React.FC<{ text: string; active: boolean; order: number; baseDelay: number; reduce: boolean }> = ({
  text,
  active,
  order,
  baseDelay,
  reduce,
}) => {
  if (reduce) {
    return <span className="text-brand-yellow">{text}</span>;
  }
  return (
    <motion.span
      className="inline-block"
      initial={{ color: INK }}
      animate={{ color: active ? YELLOW : INK }}
      transition={{ duration: 1.1, delay: active ? baseDelay + 0.18 * order : 0.12 * order, ease: 'easeInOut' }}
    >
      {text}
    </motion.span>
  );
};

/** The connector "e": the light passes through it (a flash) but it must NOT
 *  end up yellow — only "mude o mundo" keeps the color. */
const BridgeWord: React.FC<{ text: string; passing: boolean; reduce: boolean }> = ({ text, passing, reduce }) => {
  if (reduce) {
    return <span>{text}</span>;
  }
  return (
    <motion.span
      className="inline-block"
      initial={{ color: INK }}
      animate={passing ? { color: [INK, YELLOW, INK] } : { color: INK }}
      transition={{ duration: 1.5, times: [0, 0.35, 1], delay: 0.35, ease: 'easeInOut' }}
    >
      {text}
    </motion.span>
  );
};

/** Inline Lottie player: SVG renderer (vector-crisp, no wasm/CDN dependency),
 *  fed by the local public/check-recolored.json. */
const LottieCheck: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: AnimationItem | undefined;
    let cancelled = false;

    Promise.all([
      fetch('/check-recolored.json').then((response) => response.json()),
      import('lottie-web'),
    ])
      .then(([data, lottieModule]) => {
        if (cancelled || !hostRef.current) return;
        const lottie = lottieModule.default;
        anim = lottie.loadAnimation({
          container: hostRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData: data,
        });
        anim.setSpeed(0.75); // slower, more deliberate check draw
      })
      .catch(() => {
        /* headline keeps working without the check drawing */
      });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" aria-hidden="true" />;
};

/**
 * "verificada" -> check, with NO layout-projection involved (the previous
 * popLayout approach caused stretching and jank). Three coordinated tweens:
 * the word scales down to its center; the slot's WIDTH tweens from word-width
 * to check-width (gliding the sibling words); then the check blossoms in.
 */
const CheckSlot: React.FC<{ text: string; checked: boolean; reduce: boolean }> = ({ text, checked, reduce }) => {
  const wordRef = useRef<HTMLSpanElement>(null);
  const [wordWidth, setWordWidth] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(48);
  const [showCheck, setShowCheck] = useState(false);

  // Measure the word right when the shrink starts, so the slot width can
  // tween smoothly from word-width to check-width.
  useEffect(() => {
    if (checked && wordRef.current) {
      setWordWidth(wordRef.current.getBoundingClientRect().width);
      setFontSize(parseFloat(getComputedStyle(wordRef.current).fontSize) || 48);
    }
    if (!checked) {
      setShowCheck(false);
      setWordWidth(null);
    }
  }, [checked]);

  useEffect(() => {
    if (!checked) return;
    const t = setTimeout(() => setShowCheck(true), reduce ? 0 : 800);
    return () => clearTimeout(t);
  }, [checked, reduce]);

  const checkVisual = (
    <span style={{ transform: 'translateY(0.33em)' }} className="block h-[1.35em] w-[1.35em]">
      <LottieCheck />
    </span>
  );

  if (reduce) {
    return checked ? (
      <span className="inline-flex items-baseline justify-center">{checkVisual}</span>
    ) : (
      <span>{text}</span>
    );
  }

  return (
    <motion.span
      className="inline-flex items-baseline justify-center"
      initial={false}
      style={wordWidth != null ? { width: wordWidth } : undefined}
      animate={checked && wordWidth != null ? { width: fontSize * 1.15 } : {}}
      transition={{ width: { duration: 1, ease: [0.45, 0, 0.25, 1], delay: 0.15 } }}
    >
      {!showCheck ? (
        <motion.span
          ref={wordRef}
          className="inline-block origin-center whitespace-nowrap"
          animate={checked ? { scale: 0.25, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.55, 0, 0.45, 1] }}
        >
          {text}
        </motion.span>
      ) : (
        <motion.span
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative inline-flex shrink-0"
        >
          {/* soft halo that blooms once behind the check */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full bg-brand-yellow/40 blur-md"
            style={{ y: '0.33em' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.7, 2] }}
            transition={{ duration: 1.4, times: [0, 0.35, 1], ease: 'easeOut', delay: 0.25 }}
          />
          {checkVisual}
        </motion.span>
      )}
    </motion.span>
  );
};

interface RotatingHeadlineProps {
  className?: string;
  variant?: 'all' | 'verified-only';
  verifiedLoopHoldMs?: number;
}

const RotatingHeadline: React.FC<RotatingHeadlineProps> = ({
  className = '',
  variant = 'all',
  verifiedLoopHoldMs = 20_000,
}) => {
  const verifiedOnly = variant === 'verified-only';
  const [index, setIndex] = useState(verifiedOnly ? 1 : 0);
  const [cycle, setCycle] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [travelStep, setTravelStep] = useState(0);
  const [dropletAt, setDropletAt] = useState(-1); // token index; TARGET+1 = merged
  const [journey, setJourney] = useState<Journey | null>(null);
  const reduce = useReducedMotion() ?? false;
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Array<HTMLElement | null>>([]);

  /** Measure every word once and compose the full hop path as keyframes. */
  const buildJourney = (): Journey | null => {
    const parent = containerRef.current;
    if (!parent) return null;
    const pr = parent.getBoundingClientRect();
    const pts: Array<{ x: number; y: number }> = [];
    let size = 12;
    for (let k = 0; k <= DROPLET_TARGET_INDEX; k++) {
      const el = wordRefs.current[k];
      if (!el) return null;
      const er = el.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(el).fontSize) || 48;
      size = fs * 0.24;
      pts.push({
        x: er.left - pr.left + er.width / 2 - size / 2,
        y: er.top - pr.top - size - fs * 0.08,
      });
    }

    const dur = JOURNEY_DURATION;
    const hopH = size * 3;
    const x: number[] = [pts[0].x, pts[0].x];
    const xT: number[] = [0, HOP_APPEAR / dur];
    const y: number[] = [pts[0].y, pts[0].y];
    const yT: number[] = [0, HOP_APPEAR / dur];
    const yEase: Journey['yEase'] = ['linear'];
    const sy: number[] = [1, 1];
    const sx: number[] = [1, 1];
    const sqT: number[] = [0, HOP_APPEAR / dur];

    let t = HOP_APPEAR;
    for (let k = 1; k <= DROPLET_TARGET_INDEX; k++) {
      const a = pts[k - 1];
      const b = pts[k];
      // airborne arc: up (easeOut) then down (easeIn)
      y.push(Math.min(a.y, b.y) - hopH, b.y, b.y);
      yT.push((t + HOP_FLIGHT / 2) / dur, (t + HOP_FLIGHT) / dur, (t + HOP_FLIGHT + HOP_REST) / dur);
      yEase.push('easeOut', 'easeIn', 'linear');
      // x travels linearly during the flight, rests on the word
      x.push(b.x, b.x);
      xT.push((t + HOP_FLIGHT) / dur, (t + HOP_FLIGHT + HOP_REST) / dur);
      // squash & stretch: stretch mid-air, squash on landing, recover
      sy.push(1.18, 0.72, 1);
      sx.push(0.9, 1.26, 1);
      sqT.push((t + HOP_FLIGHT / 2) / dur, (t + HOP_FLIGHT) / dur, (t + HOP_FLIGHT + HOP_REST) / dur);
      t += HOP_FLIGHT + HOP_REST;
    }

    // final dive into "ONG"
    const last = pts[DROPLET_TARGET_INDEX];
    y.push(last.y + size * 1.6);
    yT.push(1);
    yEase.push('easeIn');
    x.push(last.x);
    xT.push(1);
    sy.push(1);
    sx.push(1);
    sqT.push(1);

    const appearT = (HOP_APPEAR * 0.6) / dur;
    const absorbT = (dur - HOP_ABSORB) / dur;
    return {
      size,
      x,
      xT,
      y,
      yT,
      yEase,
      o: [0, 1, 1, 0],
      oT: [0, appearT, absorbT, 1],
      s: [0.5, 1, 1, 0.25],
      sy,
      sx,
      sqT,
    };
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Reset the inner effects whenever the phrase changes; clear timers on change/unmount.
  useEffect(() => {
    setRevealed(false);
    setChecked(false);
    setTravelStep(0);
    setDropletAt(-1);
    setJourney(null);
    return clearTimers;
  }, [cycle, index]);

  // Inner timeline starts only after the reveal completes, so the hold is
  // fully readable and the effects never race the entrance animation.
  const startInnerTimeline = () => {
    setRevealed(true);
    const holdDuration = verifiedOnly
      ? CHECK_DELAY_MS + CHECK_SETTLE_MS + verifiedLoopHoldMs
      : PHRASE_HOLDS[index] ?? 10_000;
    timersRef.current.push(
      setTimeout(() => {
        if (verifiedOnly) {
          setCycle((current) => current + 1);
          return;
        }
        setIndex((current) => (current + 1) % PHRASES.length);
      }, holdDuration),
    );
    if (index === 0 && !reduce) {
      // droplet drips out of the filled "100%" and hops to "ONG";
      // the ball runs one continuous keyframe path, these timers only
      // choreograph the word colors in sync with the landings
      timersRef.current.push(
        setTimeout(() => {
          setJourney(buildJourney());
          setDropletAt(0);
        }, DROPLET_START_MS),
      );
      for (let k = 1; k <= DROPLET_TARGET_INDEX; k++) {
        const landAt = DROPLET_START_MS + (HOP_APPEAR + (k - 1) * (HOP_FLIGHT + HOP_REST) + HOP_FLIGHT) * 1000;
        timersRef.current.push(setTimeout(() => setDropletAt(k), landAt));
      }
      timersRef.current.push(
        setTimeout(
          () => setDropletAt(DROPLET_TARGET_INDEX + 1), // merged into "ONG"
          DROPLET_START_MS + JOURNEY_DURATION * 1000,
        ),
      );
    }
    if (index === 1) {
      timersRef.current.push(setTimeout(() => setChecked(true), CHECK_DELAY_MS));
    }
    if (index === 2) {
      timersRef.current.push(setTimeout(() => setTravelStep(1), HL1_DELAY_MS));
      timersRef.current.push(setTimeout(() => setTravelStep(2), HL2_DELAY_MS));
    }
  };

  const tokens = PHRASES[index];
  const label = phraseLabel(tokens);
  const merged = dropletAt > DROPLET_TARGET_INDEX;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: 0.04 } },
    exit: { transition: { staggerChildren: reduce ? 0 : 0.03 } },
  };

  const wordVar: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.4 } },
        exit: { opacity: 0, transition: { duration: 0.3 } },
      }
    : {
        hidden: { opacity: 0, y: '0.5em', filter: 'blur(6px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
        exit: { opacity: 0, y: '-0.4em', filter: 'blur(6px)', transition: { duration: 0.4, ease: [0.55, 0, 1, 0.45] } },
      };

  // Track each highlight word's position inside its own group for the stagger.
  let hl1Order = 0;
  let hl2Order = 0;

  const renderToken = (token: Token, i: number) => {
    let inner: React.ReactNode = token.text;

    if (token.role === 'fill') {
      inner = <FillWord text={token.text} active={revealed} reduce={reduce} />;
    } else if (token.role === 'drop') {
      inner = <DropWord text={token.text} lit={dropletAt === i} merged={false} />;
    } else if (token.role === 'target') {
      inner = reduce ? (
        <span className="text-brand-yellow">{token.text}</span>
      ) : (
        <DropWord text={token.text} lit={dropletAt >= i} merged={merged} />
      );
    } else if (token.role === 'check') {
      inner = <CheckSlot text={token.text} checked={checked} reduce={reduce} />;
    } else if (token.role === 'hl1') {
      inner = (
        <HighlightWord text={token.text} active={travelStep === 1} order={hl1Order++} baseDelay={0} reduce={reduce} />
      );
    } else if (token.role === 'bridge') {
      inner = <BridgeWord text={token.text} passing={travelStep >= 2} reduce={reduce} />;
    } else if (token.role === 'hl2') {
      inner = (
        <HighlightWord text={token.text} active={travelStep >= 2} order={hl2Order++} baseDelay={0.75} reduce={reduce} />
      );
    }

    return (
      <React.Fragment key={i}>
        <motion.span
          ref={(el: HTMLElement | null) => {
            if (index === 0) wordRefs.current[i] = el;
          }}
          variants={wordVar}
          className="relative inline-block"
          aria-hidden="true"
        >
          {inner}
        </motion.span>
        {i < tokens.length - 1 ? ' ' : ''}
      </React.Fragment>
    );
  };

  return (
    <div className={className} ref={containerRef} style={{ position: 'relative' }}>
      {/* the traveling droplet — the entire Pixar-lamp journey (pop out of
          "100%", parabolic hops over every word, dive into "ONG") runs as ONE
          continuous keyframe animation: perfectly smooth, no per-hop restarts */}
      {journey && !reduce && index === 0 && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-10 block"
          style={{ width: journey.size, height: journey.size }}
          initial={{ x: journey.x[0], y: journey.y[0], opacity: 0, scale: 0.5 }}
          animate={{ x: journey.x, y: journey.y, opacity: journey.o, scale: journey.s }}
          transition={{
            x: { duration: JOURNEY_DURATION, times: journey.xT, ease: 'linear' },
            y: { duration: JOURNEY_DURATION, times: journey.yT, ease: journey.yEase },
            opacity: { duration: JOURNEY_DURATION, times: journey.oT, ease: 'linear' },
            scale: { duration: JOURNEY_DURATION, times: journey.oT, ease: 'linear' },
          }}
        >
          <motion.span
            className="block h-full w-full rounded-full bg-brand-yellow shadow-[0_0_10px_rgba(255,222,89,0.85)]"
            animate={{ scaleY: journey.sy, scaleX: journey.sx }}
            transition={{ duration: JOURNEY_DURATION, times: journey.sqT, ease: 'easeInOut' }}
          />
        </motion.span>
      )}
      <AnimatePresence mode="wait">
        <motion.span
          key={`${index}-${cycle}`}
          variants={container}
          initial="hidden"
          animate="visible"
          exit="exit"
          onAnimationComplete={(def) => {
            if (def === 'visible') startInnerTimeline();
          }}
          className="inline"
          aria-label={label}
          role="text"
        >
          {tokens.map(renderToken)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default RotatingHeadline;
