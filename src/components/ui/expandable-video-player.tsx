import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";
import { Play, X } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";

import { EmbeddedVideo, VideoPreview } from "@/components/ui/embedded-video";

interface ExpandableVideoPlayerProps {
  src: string;
  title: string;
  triggerLabel: string;
  poster?: string;
  onOpenChange?: (open: boolean) => void;
}

const SPRING = {
  type: "spring",
  duration: 0.5,
  bounce: 0.12,
} as const;

const ExpandableVideoPlayer: React.FC<ExpandableVideoPlayerProps> = ({
  src,
  title,
  triggerLabel,
  poster,
  onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  const changeOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={changeOpen}>
      <DialogPrimitive.Trigger asChild>
        <motion.button
          ref={triggerRef}
          type="button"
          whileTap={reducedMotion ? undefined : { transform: "scale(0.97)" }}
          transition={SPRING}
          className="group relative aspect-video w-full max-w-[18rem] overflow-hidden rounded-lg bg-brand-ink text-left shadow-[0_18px_42px_-24px_rgba(12,48,72,0.68)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
          aria-label={triggerLabel}
        >
          <VideoPreview
            src={src}
            title={title}
            poster={poster}
            className="absolute inset-0"
          />
          <span
            className="absolute inset-0 bg-black/15 transition-colors duration-200 group-hover:bg-black/25"
            aria-hidden="true"
          />
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-bold text-brand-ink shadow-lg backdrop-blur-sm">
              <Play size={16} className="fill-brand-blue text-brand-blue" />
              Assistir
            </span>
          </span>
        </motion.button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay asChild>
          <div
            data-video-overlay
            className="fixed inset-0 z-[130] bg-brand-ink/90 backdrop-blur-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:duration-0"
          />
        </DialogPrimitive.Overlay>

        <DialogPrimitive.Content
          asChild
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => closeRef.current?.focus());
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <div
            data-video-overlay
            className="fixed left-1/2 top-1/2 z-[131] aspect-video w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-black shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:duration-0 motion-reduce:transform-none"
            aria-label={title}
          >
            <DialogPrimitive.Title className="sr-only">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Reprodução do vídeo da organização.
            </DialogPrimitive.Description>
            <EmbeddedVideo src={src} title={title} poster={poster} autoplay />
            <DialogPrimitive.Close asChild>
              <button
                ref={closeRef}
                type="button"
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Fechar vídeo"
              >
                <X size={21} aria-hidden="true" />
              </button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ExpandableVideoPlayer;