import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { CircleCheckBig } from "lucide-react";
import type { AnimationItem } from "lottie-web";

import { cn } from "@/lib/utils";

interface PaymentSuccessCheckProps {
  onComplete: () => void;
  className?: string;
}

const ANIMATION_SPEED = 1.65;
const ANIMATION_FALLBACK_MS = 4_000;
const REDUCED_MOTION_DURATION_MS = 700;
export const SUCCESS_HOLD_AFTER_ANIMATION_MS = 2_000;

export const PaymentSuccessCheck = ({ onComplete, className }: PaymentSuccessCheckProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const onCompleteRef = useRef(onComplete);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let animationFinished = false;
    let cancelled = false;
    let fallbackTimer: number | undefined;
    let holdTimer: number | undefined;

    const finish = () => {
      if (animationFinished || cancelled) return;
      animationFinished = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      holdTimer = window.setTimeout(
        () => !cancelled && onCompleteRef.current(),
        SUCCESS_HOLD_AFTER_ANIMATION_MS,
      );
    };

    if (import.meta.env.MODE === "test") {
      finish();
      return () => {
        cancelled = true;
        if (holdTimer !== undefined) window.clearTimeout(holdTimer);
      };
    }

    if (reduceMotion) {
      fallbackTimer = window.setTimeout(finish, REDUCED_MOTION_DURATION_MS);
      return () => {
        cancelled = true;
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        if (holdTimer !== undefined) window.clearTimeout(holdTimer);
      };
    }

    const container = containerRef.current;
    if (!container) return undefined;

    fallbackTimer = window.setTimeout(finish, ANIMATION_FALLBACK_MS);
    void Promise.all([
      import("lottie-web"),
      import("@/assets/lottie/check-pay/success circle check.json"),
    ])
      .then(([{ default: lottie }, { default: animationData }]) => {
        if (cancelled || animationFinished) return;
        const animation = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: false,
          autoplay: true,
          animationData,
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        });
        animation.setSpeed(ANIMATION_SPEED);
        animation.addEventListener("complete", finish);
        animationRef.current = animation;
      })
      .catch(finish);

    return () => {
      cancelled = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (holdTimer !== undefined) window.clearTimeout(holdTimer);
      animationRef.current?.removeEventListener("complete", finish);
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [reduceMotion]);

  return (
    <div className={cn("mx-auto grid size-36 place-items-center overflow-hidden", className)} role="img" aria-label="Pagamento identificado">
      {reduceMotion ? (
        <CircleCheckBig className="size-24 text-emerald-500" strokeWidth={1.7} aria-hidden="true" />
      ) : (
        <div ref={containerRef} className="size-full" aria-hidden="true" />
      )}
    </div>
  );
};

export default PaymentSuccessCheck;
