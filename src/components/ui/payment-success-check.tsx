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

export const PaymentSuccessCheck = ({
  onComplete,
  className,
}: PaymentSuccessCheckProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const onCompleteRef = useRef(onComplete);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let finished = false;
    let fallbackTimer: number | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      onCompleteRef.current();
    };

    if (reduceMotion) {
      fallbackTimer = window.setTimeout(finish, REDUCED_MOTION_DURATION_MS);
      return () => window.clearTimeout(fallbackTimer);
    }

    const container = containerRef.current;
    if (!container || import.meta.env.MODE === "test") return undefined;

    let cancelled = false;
    fallbackTimer = window.setTimeout(finish, ANIMATION_FALLBACK_MS);
    void Promise.all([
      import("lottie-web"),
      import("@/assets/lottie/check-pay/success circle check.json"),
    ])
      .then(([{ default: lottie }, { default: animationData }]) => {
        if (cancelled || finished) return;
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
      animationRef.current?.removeEventListener("complete", finish);
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [reduceMotion]);

  return (
    <div
      className={cn(
        "mx-auto grid size-36 place-items-center overflow-hidden",
        className,
      )}
      role="img"
      aria-label="Pagamento identificado"
    >
      {reduceMotion ? (
        <CircleCheckBig
          className="size-24 text-emerald-500"
          strokeWidth={1.7}
          aria-hidden="true"
        />
      ) : (
        <div ref={containerRef} className="size-full" aria-hidden="true" />
      )}
    </div>
  );
};

export default PaymentSuccessCheck;