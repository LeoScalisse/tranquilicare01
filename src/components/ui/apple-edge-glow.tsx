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

const edgeEntry = {
  right: { hidden: "translateX(115%)", visible: "translateX(0%)" },
  bottom: { hidden: "translateY(115%)", visible: "translateY(0%)" },
  left: { hidden: "translateX(-115%)", visible: "translateX(0%)" },
  top: { hidden: "translateY(-115%)", visible: "translateY(0%)" },
} as const;

const intensityOpacity: Record<GlowIntensity, number> = {
  sm: 0.58,
  md: 0.66,
  lg: 0.74,
  xl: 0.82,
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
          const transform = reduceMotion
            ? edgeEntry[edge].visible
            : active
              ? edgeEntry[edge].visible
              : edgeEntry[edge].hidden;

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
            />
          );
        })}
      </span>
    </motion.div>,
    document.body,
  );
};

export default AppleEdgeGlow;
