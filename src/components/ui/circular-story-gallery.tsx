import { useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

import "./circular-story-gallery.css";

export interface CircularStoryMedia {
  id: string;
  url: string;
  caption?: string;
  ngoName: string;
}

interface CircularStoryGalleryProps {
  items: CircularStoryMedia[];
}

const MAX_VISIBLE_STORIES = 10;
const AUTO_ROTATION_DEGREES_PER_MS = 0.0016;
const AUTO_RESUME_DELAY_MS = 1_800;

/** Interactive radial selector shown around the resting stories preview. */
const CircularStoryGallery = ({ items }: CircularStoryGalleryProps) => {
  const reduceMotion = useReducedMotion();
  const visibleItems = items.slice(0, MAX_VISIBLE_STORIES);
  const [activeIndex, setActiveIndex] = useState(0);
  const lastPanAt = useRef(0);
  const autoResumeAt = useRef(0);
  const rotation = useMotionValue(0);
  const smoothRotation = useSpring(rotation, {
    stiffness: reduceMotion ? 1000 : 210,
    damping: reduceMotion ? 1000 : 24,
    mass: 0.8,
  });

  useAnimationFrame((_, delta) => {
    if (reduceMotion || Date.now() < autoResumeAt.current) return;
    rotation.set(rotation.get() + delta * AUTO_ROTATION_DEGREES_PER_MS);
  });

  if (visibleItems.length === 0) return null;

  const selectStory = (index: number) => {
    if (Date.now() - lastPanAt.current < 140) return;
    autoResumeAt.current = Date.now() + AUTO_RESUME_DELAY_MS;
    setActiveIndex(index);
  };

  return (
    <section
      data-circular-story-gallery
      className="circular-story-gallery"
      aria-label="Seletor circular de histórias"
    >
      <motion.div
        className="circular-story-gallery__orbit"
        style={{ rotate: smoothRotation }}
        onPanStart={() => {
          autoResumeAt.current = Number.POSITIVE_INFINITY;
        }}
        onPan={(_, info) => {
          lastPanAt.current = Date.now();
          rotation.set(rotation.get() + info.delta.x * 0.45);
        }}
        onPanEnd={(_, info) => {
          lastPanAt.current = Date.now();
          rotation.set(rotation.get() + info.velocity.x * 0.055);
          autoResumeAt.current = Date.now() + AUTO_RESUME_DELAY_MS;
        }}
        onPointerCancel={() => {
          autoResumeAt.current = Date.now() + AUTO_RESUME_DELAY_MS;
        }}
        aria-label="Arraste horizontalmente para girar as histórias"
      >
        {visibleItems.map((item, index) => {
          const angle =
            (index / visibleItems.length) * Math.PI * 2 - Math.PI / 2;
          const style = {
            "--story-x": `${50 + Math.cos(angle) * 43}%`,
            "--story-y": `${50 + Math.sin(angle) * 43}%`,
            "--story-angle": `${(angle * 180) / Math.PI + 90}deg`,
          } as React.CSSProperties;

          return (
            <motion.button
              type="button"
              key={item.id}
              data-circular-story-card
              data-active={index === activeIndex ? "true" : "false"}
              className="circular-story-gallery__card"
              style={style}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: reduceMotion ? 0 : Math.min(index * 0.045, 0.36),
                type: "spring",
                bounce: 0.2,
                duration: 0.46,
              }}
              onClick={() => selectStory(index)}
              aria-label={`Selecionar história de ${item.ngoName}`}
              aria-pressed={index === activeIndex}
            >
              <img
                src={item.url}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
              <span className="circular-story-gallery__card-shade" />
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
};

export default CircularStoryGallery;
