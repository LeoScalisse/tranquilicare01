import { useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Instagram } from "lucide-react";

import { normalizeCircularDragDelta } from "@/lib/circularDrag";
import type { StoryPresentationType } from "@/types/storyPresentation";

import "./circular-story-gallery.css";

export interface CircularStoryMedia {
  id: string;
  url: string;
  type?: StoryPresentationType;
  caption?: string;
  ngoName: string;
}

interface CircularStoryGalleryProps {
  items: CircularStoryMedia[];
}

const MAX_VISIBLE_STORIES = 10;
const AUTO_ROTATION_DEGREES_PER_MS = 0.0016;
const AUTO_RESUME_DELAY_MS = 1_800;
const ANGULAR_DEAD_ZONE = 0.14;
const MAX_ANGULAR_STEP = 11;

/** Interactive radial selector shown around the resting stories preview. */
const CircularStoryGallery = ({ items }: CircularStoryGalleryProps) => {
  const reduceMotion = useReducedMotion();
  const visibleItems = items.slice(0, MAX_VISIBLE_STORIES);
  const [activeIndex, setActiveIndex] = useState(0);
  const orbitRef = useRef<HTMLDivElement>(null);
  const lastPanAt = useRef(0);
  const autoResumeAt = useRef(0);
  const lastPointerAngle = useRef<number | null>(null);
  const dragDirection = useRef<-1 | 0 | 1>(0);
  const lastAcceptedDelta = useRef(0);
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

  const angleFromPoint = (point: { x: number; y: number }) => {
    const bounds = orbitRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const x = point.x - (bounds.left + bounds.width / 2);
    const y = point.y - (bounds.top + bounds.height / 2);
    if (Math.hypot(x, y) < Math.min(bounds.width, bounds.height) * 0.12) return null;
    return Math.atan2(y, x) * (180 / Math.PI);
  };

  return (
    <section
      data-circular-story-gallery
      className="circular-story-gallery"
      aria-label="Seletor circular de histórias"
    >
      <motion.div
        ref={orbitRef}
        className="circular-story-gallery__orbit"
        style={{ rotate: smoothRotation }}
        onPanStart={(_, info) => {
          autoResumeAt.current = Number.POSITIVE_INFINITY;
          lastPointerAngle.current = angleFromPoint(info.point);
          dragDirection.current = 0;
          lastAcceptedDelta.current = 0;
        }}
        onPan={(_, info) => {
          lastPanAt.current = Date.now();
          const currentAngle = angleFromPoint(info.point);
          const previousAngle = lastPointerAngle.current;
          lastPointerAngle.current = currentAngle;
          if (currentAngle === null || previousAngle === null) return;

          const rawDelta = normalizeCircularDragDelta(currentAngle - previousAngle);
          if (Math.abs(rawDelta) < ANGULAR_DEAD_ZONE) return;
          const nextDirection = Math.sign(rawDelta) as -1 | 1;
          if (dragDirection.current === 0) dragDirection.current = nextDirection;
          // Lock the gesture direction until pointer-up. Small diagonal wobbles
          // can no longer reverse the orbit in the middle of the same drag.
          if (nextDirection !== dragDirection.current) return;

          const acceptedDelta = Math.max(-MAX_ANGULAR_STEP, Math.min(MAX_ANGULAR_STEP, rawDelta));
          lastAcceptedDelta.current = acceptedDelta;
          rotation.set(rotation.get() + acceptedDelta);
        }}
        onPanEnd={() => {
          lastPanAt.current = Date.now();
          const momentum = Math.max(-18, Math.min(18, lastAcceptedDelta.current * 3.2));
          rotation.set(rotation.get() + momentum);
          autoResumeAt.current = Date.now() + AUTO_RESUME_DELAY_MS;
          lastPointerAngle.current = null;
          dragDirection.current = 0;
          lastAcceptedDelta.current = 0;
        }}
        onPointerCancel={() => {
          autoResumeAt.current = Date.now() + AUTO_RESUME_DELAY_MS;
          lastPointerAngle.current = null;
          dragDirection.current = 0;
          lastAcceptedDelta.current = 0;
        }}
        aria-label="Arraste ao redor do círculo para girar as histórias"
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
              {item.type === "video" ? (
                <video
                  src={item.url}
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              ) : item.type === "instagram" ? (
                <span className="circular-story-gallery__instagram" aria-hidden="true">
                  <Instagram />
                  <span>Instagram</span>
                </span>
              ) : (
                <img
                  src={item.url}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              )}
              <span className="circular-story-gallery__card-shade" />
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
};

export default CircularStoryGallery;
