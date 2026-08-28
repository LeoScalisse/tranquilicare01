import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface Rotating3DStaggerTextProps {
  texts: string[];
  intervalMs?: number;
  className?: string;
}

const TRANSITION_DURATION = 0.24;

export const Rotating3DStaggerText = ({
  texts,
  intervalMs = 3_000,
  className,
}: Rotating3DStaggerTextProps) => {
  const reducedMotion = Boolean(useReducedMotion());
  const safeTexts = useMemo(
    () => texts.map((text) => text.trim()).filter(Boolean),
    [texts],
  );
  const textKey = safeTexts.join("\u0001");
  const shouldAnimate = !reducedMotion && import.meta.env.MODE !== "test";
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [incomingText, setIncomingText] = useState<string | null>(null);
  const scopeRef = useRef<HTMLSpanElement>(null);
  const outgoingRef = useRef<HTMLSpanElement>(null);
  const incomingRef = useRef<HTMLSpanElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    setActiveIndex(0);
    setDisplayedIndex(0);
    setIncomingText(null);
  }, [textKey]);

  useEffect(() => {
    if (safeTexts.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeTexts.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, safeTexts.length]);

  const activeText = safeTexts[activeIndex] ?? safeTexts[0];

  useEffect(() => {
    if (activeIndex === displayedIndex) return;

    if (!shouldAnimate) {
      setDisplayedIndex(activeIndex);
      return;
    }

    setIncomingText(activeText);
  }, [activeIndex, activeText, displayedIndex, shouldAnimate]);

  useGSAP(
    () => {
      if (!incomingText || !outgoingRef.current || !incomingRef.current) return;

      const outgoing = outgoingRef.current;
      const incoming = incomingRef.current;
      const stroke = strokeRef.current;

      gsap.set(incoming, { autoAlpha: 0, yPercent: 100 });
      if (stroke) gsap.set(stroke, { autoAlpha: 0, drawSVG: 0 });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          gsap.set(outgoing, { clearProps: "transform,opacity,visibility" });
          setDisplayedIndex(activeIndex);
          setIncomingText(null);
        },
      });

      timeline
        .to(outgoing, { autoAlpha: 0, yPercent: -100, duration: 0.2 }, 0)
        .to(
          incoming,
          { autoAlpha: 1, yPercent: 0, duration: TRANSITION_DURATION },
          0.03,
        );

      if (stroke) {
        timeline.to(
          stroke,
          { autoAlpha: 0.9, drawSVG: "100%", duration: TRANSITION_DURATION },
          0.01,
        );
      }
    },
    { scope: scopeRef, dependencies: [activeIndex, incomingText] },
  );

  if (safeTexts.length === 0) return null;

  const displayedText = safeTexts[displayedIndex] ?? safeTexts[0];

  return (
    <span
      ref={scopeRef}
      aria-label={displayedText}
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "relative flex min-h-[2.1em] max-w-full items-center overflow-visible",
        className,
      )}
      data-testid="rotating-3d-stagger-text"
    >
      <span className="relative block min-h-[1.35em] max-w-full overflow-hidden text-left">
        <span
          ref={outgoingRef}
          aria-hidden="true"
          className="block will-change-transform"
        >
          {displayedText}
        </span>
        {incomingText ? (
          <span
            ref={incomingRef}
            aria-hidden="true"
            className="absolute inset-x-0 top-0 block will-change-transform"
          >
            {incomingText}
          </span>
        ) : null}
      </span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1 right-0 h-3 w-12 overflow-visible text-white/70 opacity-0"
        fill="none"
        viewBox="0 0 48 12"
      >
        <path
          ref={strokeRef}
          d="M1 9C12 2 27 2 47 6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
};

export default Rotating3DStaggerText;
