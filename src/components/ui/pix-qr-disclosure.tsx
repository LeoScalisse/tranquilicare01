import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  type Transition,
  useReducedMotion,
} from "framer-motion";
import { Check, Copy, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import useMeasure from "react-use-measure";

import { cn } from "@/lib/utils";
import "./pix-qr-disclosure.css";

interface PixQrDisclosureProps {
  value: string;
  qrCodeImage?: string;
  buttonLabel?: string;
  onCopy?: () => void;
  onCopyError?: () => void;
  onExpandedChange?: (isExpanded: boolean) => void;
  className?: string;
}

const COPY_FEEDBACK_DURATION_MS = 2_000;
const COLLAPSED_WIDTH = 176;
const COLLAPSED_HEIGHT = 48;
const EXPANDED_WIDTH = 304;

export const PixQrDisclosure = ({
  value,
  qrCodeImage,
  buttonLabel = "Só Abrir QR",
  onCopy,
  onCopyError,
  onExpandedChange,
  className,
}: PixQrDisclosureProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [measureRef, bounds] = useMeasure();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isCopied) return;
    const timer = window.setTimeout(
      () => setIsCopied(false),
      COPY_FEEDBACK_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isCopied]);

  const morphTransition: Transition = reduceMotion
    ? { duration: 0.01 }
    : isExpanded
      ? { type: "spring", bounce: 0.24, visualDuration: 0.38 }
      : { type: "spring", bounce: 0.14, visualDuration: 0.34 };

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      onCopy?.();
    } catch {
      setIsCopied(false);
      onCopyError?.();
    }
  };

  const setExpanded = (nextExpanded: boolean) => {
    setIsExpanded(nextExpanded);
    if (!nextExpanded) setIsCopied(false);
    onExpandedChange?.(nextExpanded);
  };

  const collapse = () => setExpanded(false);

  return (
    <section
      className={cn(
        "flex w-full items-center justify-center overflow-hidden py-2",
        className,
      )}
      aria-label="Pagamento por PIX"
    >
      <MotionConfig transition={morphTransition}>
        <motion.div
          initial={false}
          animate={{
            width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
            height: isExpanded
              ? Math.max(bounds.height, COLLAPSED_HEIGHT)
              : COLLAPSED_HEIGHT,
            borderRadius: isExpanded ? 28 : 12,
          }}
          className={cn(
            "pix-qr-shell max-w-full overflow-hidden",
            isExpanded && "pix-qr-card",
          )}
        >
          <div ref={measureRef}>
            <AnimatePresence initial={false} mode="popLayout">
              {!isExpanded ? (
                <motion.button
                  key="support-trigger"
                  type="button"
                  className="tc-button-3d flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 font-bold text-white"
                  aria-expanded="false"
                  onClick={() => setExpanded(true)}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, filter: "blur(4px)" }
                  }
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                >
                  <QrCode aria-hidden="true" size={19} strokeWidth={2.2} />
                  <span>{buttonLabel}</span>
                </motion.button>
              ) : (
                <motion.div
                  key="pix-details"
                  className="flex flex-col gap-3 p-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: reduceMotion ? 0.01 : 0.18 },
                  }}
                >
                  <motion.div
                    className="grid place-items-center rounded-[1.4rem] bg-white p-3"
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            transform: "translateY(60px) scale(1.2)",
                          }
                    }
                    animate={{
                      opacity: 1,
                      transform: "translateY(0) scale(1)",
                    }}
                  >
                    {qrCodeImage ? (
                      <img
                        src={qrCodeImage}
                        alt="QR Code PIX para pagamento"
                        className="size-56 rounded-2xl object-contain"
                      />
                    ) : (
                      <QRCodeSVG
                        value={value}
                        level="M"
                        marginSize={1}
                        role="img"
                        title="QR Code PIX para pagamento"
                        className="size-56 rounded-2xl bg-white p-2 text-black"
                      />
                    )}
                  </motion.div>

                  <motion.div className="flex items-center gap-2" layout>
                    <motion.button
                      type="button"
                      className="pix-qr-action flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 font-semibold"
                      aria-label={
                        isCopied ? "Código PIX copiado" : "Copiar código PIX"
                      }
                      onClick={() => void copyPixCode()}
                      layout
                    >
                      <AnimatePresence initial={false} mode="wait">
                        <motion.span
                          key={isCopied ? "checked" : "copy"}
                          initial={
                            reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, transform: "scale(0.72)" }
                          }
                          animate={{ opacity: 1, transform: "scale(1)" }}
                          exit={{ opacity: 0, transform: "scale(0.72)" }}
                          className="grid shrink-0 place-items-center"
                          aria-hidden="true"
                        >
                          {isCopied ? <Check size={18} /> : <Copy size={18} />}
                        </motion.span>
                      </AnimatePresence>
                      <AnimatedCopyLabel isCopied={isCopied} />
                      <span className="sr-only" aria-live="polite">
                        {isCopied ? "Código PIX copiado" : "Copiar código PIX"}
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      className="pix-qr-action grid size-11 shrink-0 place-items-center rounded-full"
                      aria-label="Fechar QR Code"
                      onClick={collapse}
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                    >
                      <X size={19} aria-hidden="true" />
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </section>
  );
};

const AnimatedCopyLabel = ({ isCopied }: { isCopied: boolean }) => {
  const activeText = isCopied ? "Copiado" : "Copiar código PIX";

  return (
    <span
      className="flex min-w-0 justify-center tracking-tight"
      aria-hidden="true"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {activeText.split("").map((character, index) => (
          <motion.span
            key={`${activeText}-${character}-${index}`}
            layout
            initial={{ opacity: 0, transform: "translateY(5px) scale(0.72)" }}
            animate={{
              opacity: 1,
              transform: "translateY(0) scale(1)",
              transition: {
                type: "spring",
                stiffness: 220,
                damping: 22,
                delay: 0.022 * index,
              },
            }}
            exit={{ opacity: 0, transform: "translateY(-5px) scale(0.72)" }}
          >
            {character === " " ? "\u00a0" : character}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
};
