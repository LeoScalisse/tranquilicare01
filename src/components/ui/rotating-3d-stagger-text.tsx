import {
  useAnimate,
  useReducedMotion,
  type AnimationPlaybackControlsWithThen,
} from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface Rotating3DStaggerTextProps {
  texts: string[];
  intervalMs?: number;
  className?: string;
}

interface CharacterProps {
  character: string;
}

interface WordPart {
  characters: string[];
  needsSpace: boolean;
}

const HAS_SEGMENTER = typeof Intl !== "undefined" && "Segmenter" in Intl;
const STAGGER_DURATION = 0.05;
const RESTING_TRANSFORM = "translateZ(-0.5lh) rotateX(0deg)";
const FLIPPED_TRANSFORM = "translateZ(-0.5lh) rotateX(-90deg)";
const FRONT_FACE_TRANSFORM = "translateZ(0.5lh)";
const SECOND_FACE_TRANSFORM = "rotateX(90deg) translateZ(0.5lh)";

const splitIntoCharacters = (text: string): string[] => {
  if (HAS_SEGMENTER) {
    const segmenter = new (
      Intl as typeof Intl & {
        Segmenter: new (
          locale: string,
          options: { granularity: "grapheme" },
        ) => { segment: (value: string) => Iterable<{ segment: string }> };
      }
    ).Segmenter("pt-BR", { granularity: "grapheme" });

    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }

  return Array.from(text);
};

const Character = memo(({ character }: CharacterProps) => (
  <span
    className="tc-3d-stagger-character inline-block"
    style={{
      transformStyle: "preserve-3d",
      transform: RESTING_TRANSFORM,
      WebkitTransform: RESTING_TRANSFORM,
    }}
  >
    <span
      className="relative block h-[1lh] text-current"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: FRONT_FACE_TRANSFORM,
        WebkitTransform: FRONT_FACE_TRANSFORM,
      }}
    >
      {character}
    </span>
    <span
      className="absolute left-0 top-0 block h-[1lh] text-current"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: SECOND_FACE_TRANSFORM,
        WebkitTransform: SECOND_FACE_TRANSFORM,
      }}
    >
      {character}
    </span>
  </span>
));

Character.displayName = "Character";

interface Text3DStaggerFlipProps {
  text: string;
  reducedMotion: boolean;
}

const Text3DStaggerFlip = ({ text, reducedMotion }: Text3DStaggerFlipProps) => {
  const [scope, scopedAnimate] = useAnimate();
  const animationRef = useRef<AnimationPlaybackControlsWithThen | null>(null);
  const mountedRef = useRef(false);

  const words = useMemo<WordPart[]>(
    () =>
      text.split(" ").map((word, index, list) => ({
        characters: splitIntoCharacters(word),
        needsSpace: index !== list.length - 1,
      })),
    [text],
  );

  const characterOffsets = useMemo(() => {
    const offsets = [0];
    for (const word of words) {
      offsets.push(offsets[offsets.length - 1] + word.characters.length);
    }
    return offsets;
  }, [words]);

  const playAnimation = useCallback(async () => {
    if (reducedMotion) return;

    const totalCharacters = words.reduce(
      (total, word) => total + word.characters.length,
      0,
    );
    const center = Math.floor(totalCharacters / 2);

    animationRef.current?.stop();
    animationRef.current = scopedAnimate(
      ".tc-3d-stagger-character",
      { transform: FLIPPED_TRANSFORM },
      {
        type: "spring",
        damping: 30,
        stiffness: 300,
        mass: 1,
        delay: (index: number) => Math.abs(center - index) * STAGGER_DURATION,
      },
    );

    await animationRef.current;
    if (!mountedRef.current) return;

    animationRef.current = scopedAnimate(
      ".tc-3d-stagger-character",
      { transform: RESTING_TRANSFORM },
      { duration: 0 },
    );
  }, [reducedMotion, scopedAnimate, words]);

  useEffect(() => {
    mountedRef.current = true;
    void playAnimation();

    return () => {
      mountedRef.current = false;
      animationRef.current?.stop();
    };
  }, [playAnimation, text]);

  return (
    <span
      ref={scope}
      aria-label={text}
      className="flex w-full flex-wrap text-left [perspective:800px] [perspective-origin:center_center]"
    >
      {words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          aria-hidden="true"
          className="inline-flex [transform-style:preserve-3d]"
        >
          {word.characters.map((character, characterIndex) => (
            <Character
              key={characterOffsets[wordIndex] + characterIndex}
              character={character}
            />
          ))}
          {word.needsSpace ? <span className="whitespace-pre"> </span> : null}
        </span>
      ))}
    </span>
  );
};

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
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [safeTexts]);

  useEffect(() => {
    if (safeTexts.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeTexts.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, safeTexts.length]);

  if (safeTexts.length === 0) return null;

  return (
    <span
      className={cn(
        "relative flex min-h-[2.1em] items-center overflow-visible",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
      data-testid="rotating-3d-stagger-text"
    >
      <Text3DStaggerFlip
        text={safeTexts[activeIndex]}
        reducedMotion={reducedMotion}
      />
    </span>
  );
};

export default Rotating3DStaggerText;
