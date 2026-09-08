import React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./apple-edge-glow.css";

type GlowIntensity = "sm" | "md" | "lg" | "xl";

interface AppleEdgeGlowProps {
  preview?: boolean;
  intensity?: GlowIntensity;
  /** Checkout progress, clockwise: right, bottom, left, then top. */
  stage?: 0 | 1 | 2 | 3 | 4;
  className?: string;
}

const edgeNames = ["right", "bottom", "left", "top"] as const;

const visibleTransform = "translate3d(0, 0, 0)";

const getHiddenTransform = (
  edge: (typeof edgeNames)[number],
  stage: number,
) => {
  const distance = 115 * Math.max(stage, 1);

  switch (edge) {
    case "right":
      return `translate3d(${distance}%, 0, 0)`;
    case "bottom":
      return `translate3d(0, ${distance}%, 0)`;
    case "left":
      return `translate3d(-${distance}%, 0, 0)`;
    case "top":
      return `translate3d(0, -${distance}%, 0)`;
  }
};
const intensityOpacity: Record<GlowIntensity, number> = {
  sm: 0.38,
  md: 0.44,
  lg: 0.5,
  xl: 0.56,
};

export const AppleEdgeGlow: React.FC<AppleEdgeGlowProps> = ({
  preview = false,
  intensity = "xl",
  stage = 0,
  className,
}) => {
  const reduceMotion = useReducedMotion();

  if (!preview || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      aria-hidden="true"
      data-intensity={intensity}
      data-stage={stage}
      data-complete={stage === 4 ? "true" : undefined}
      className={cn("apple-edge-glow", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: reduceMotion ? 0.01 : 0.24,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <span className="apple-edge-glow__surface">
        {edgeNames.map((edge, index) => {
          const active = stage >= index + 1;
          const transform =
            reduceMotion || active
              ? visibleTransform
              : getHiddenTransform(edge, stage);
          return (
            <motion.span
              key={edge}
              data-active={active ? "true" : "false"}
              className={`apple-edge-glow__edge apple-edge-glow__edge--${edge}`}
              initial={false}
              animate={{
                opacity: active ? intensityOpacity[intensity] : 0,
                transform,
              }}
              transition={{
                duration: reduceMotion ? 0.18 : 1.15,
                ease: [0.77, 0, 0.175, 1],
              }}
            >
              <span className="apple-edge-glow__edge-fill" />
            </motion.span>
          );
        })}
      </span>
    </motion.div>,
    document.body,
  );
};

export default AppleEdgeGlow;
