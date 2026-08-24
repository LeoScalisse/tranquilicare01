import React, { useEffect, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Check,
  Clock3,
  HandHeart,
  Target,
} from "lucide-react";

import { formatBRL } from "@/lib/impact";
import type { FlashCampaign } from "@/types";

interface FundraiserDisclosureCardProps {
  campaign: FlashCampaign;
  onOpen: (campaign: FlashCampaign) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export const FundraiserDisclosureCard: React.FC<
  FundraiserDisclosureCardProps
> = ({ campaign, onOpen, onExpandedChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.min(
    100,
    Math.round((campaign.raised / campaign.goal) * 100),
  );
  const missing = Math.max(0, campaign.goal - campaign.raised);
  const remaining = Math.max(0, campaign.endsAt - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const timeLabel =
    remaining <= 0
      ? "Encerrada"
      : days > 0
        ? `Faltam ${days} ${days === 1 ? "dia" : "dias"}`
        : `Faltam ${Math.max(1, hours)}h`;
  const transition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, bounce: 0.08, duration: 0.38 };
  const id = campaign.id;

  const toggleExpanded = () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };

  return (
    <LayoutGroup id={`campaign-${id}`}>
      <motion.article
        layout
        initial={false}
        transition={transition}
        onClick={toggleExpanded}
        onKeyDown={(event) => {
          if (
            event.currentTarget === event.target &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            toggleExpanded();
          }
        }}
        role="button"
        tabIndex={0}
        className={`relative flex min-h-[220px] w-[88vw] max-w-[440px] shrink-0 flex-col cursor-pointer overflow-hidden border-2 border-brand-ink/10 bg-white shadow-[0_18px_50px_-30px_rgba(13,45,65,0.62)] outline-none select-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 ${
          expanded ? "rounded-[26px] p-5 sm:p-[22px]" : "rounded-[20px] p-4"
        }`}
        aria-expanded={expanded}
        aria-label={`${campaign.title}. ${progress}% da meta. ${expanded ? "Ocultar detalhes" : "Mostrar detalhes"}`}
      >
        <div className="relative z-10 flex items-center justify-between gap-2">
          <motion.div
            layout="position"
            transition={transition}
            className={`flex min-w-0 items-center gap-2 rounded-3xl py-0.5 pr-2 pl-1.5 ${
              expanded ? "bg-transparent" : "bg-secondary/65"
            }`}
          >
            <motion.img
              layoutId={`campaign-image-${id}`}
              src={campaign.image}
              alt=""
              className={`shrink-0 border-2 border-white object-cover shadow-sm ${
                expanded ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-xl"
              }`}
            />
            <motion.h3
              layout="position"
              transition={transition}
              className={`truncate font-display font-semibold text-brand-ink ${
                expanded ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
              }`}
            >
              {campaign.title}
            </motion.h3>
          </motion.div>

          <AnimatePresence mode="popLayout" initial={false}>
            {!expanded && (
              <motion.div
                key="collapsed-progress"
                initial={{ opacity: 0, scale: 0.9, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 10 }}
                className="flex shrink-0 items-center gap-2"
              >
                <motion.div
                  layoutId={`campaign-progress-container-${id}`}
                  className="relative h-2 w-16 overflow-hidden rounded-full bg-secondary sm:w-28"
                >
                  <motion.div
                    layoutId={`campaign-progress-fill-${id}`}
                    className="relative h-full overflow-hidden rounded-full bg-brand-blue"
                    style={{ width: `${progress}%` }}
                  >
                    {!reduceMotion && (
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 1.6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                  </motion.div>
                </motion.div>
                <motion.span
                  layoutId={`campaign-progress-text-${id}`}
                  className="text-sm font-bold text-brand-blue"
                >
                  {progress}%
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {!expanded && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mt-5 rounded-2xl border border-brand-ink/5 bg-secondary/40 p-3"
            >
              <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                {campaign.description}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-brand-ink/5 pt-3 text-xs">
                <span className="font-semibold text-muted-foreground">
                  Meta da vaquinha
                </span>
                <span className="font-bold text-brand-ink">
                  {formatBRL(campaign.goal)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="popLayout" initial={false}>
          {!expanded && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="mt-auto flex items-center justify-between gap-3 px-1 pt-4 text-xs font-semibold text-muted-foreground"
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <Building2 size={15} className="shrink-0" />
                {campaign.ngoName}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Clock3 size={15} />
                {timeLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          {expanded && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.12 } }}
              transition={{ duration: reduceMotion ? 0.01 : 0.26 }}
              className="mt-6 origin-top"
            >
              <div className="mb-7 flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/45 px-2.5 py-1.5">
                <Target size={18} className="text-brand-blue" />
                <motion.div
                  layoutId={`campaign-progress-container-${id}`}
                  className="h-2 w-24 overflow-hidden rounded-full bg-secondary sm:w-28"
                >
                  <motion.div
                    layoutId={`campaign-progress-fill-${id}`}
                    className="h-full rounded-full bg-brand-blue"
                    style={{ width: `${progress}%` }}
                  />
                </motion.div>
                <motion.span
                  layoutId={`campaign-progress-text-${id}`}
                  className="text-sm font-bold text-brand-blue"
                >
                  {progress}%
                </motion.span>
              </div>

              <div className="relative mb-7 ml-5 flex flex-col gap-5">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  className="absolute top-0 bottom-4 left-0 w-[2px] origin-top bg-border"
                />
                {[
                  [
                    "Arrecadado",
                    formatBRL(campaign.raised),
                    campaign.raised > 0,
                  ],
                  [
                    "Meta da vaquinha",
                    formatBRL(campaign.goal),
                    progress >= 100,
                  ],
                  ["Falta arrecadar", formatBRL(missing), missing === 0],
                ].map(([label, value, completed], index) => (
                  <motion.div
                    key={String(label)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: reduceMotion ? 0 : 0.08 + index * 0.04,
                    }}
                    className="relative flex items-center pl-8"
                  >
                    <span className="absolute top-[-10px] left-0 h-[30px] w-5 rounded-bl-xl border-b-2 border-l-2 border-border" />
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        completed
                          ? "border-brand-blue bg-brand-blue"
                          : "border-border bg-white"
                      }`}
                    >
                      {completed && (
                        <Check
                          size={12}
                          className="text-white"
                          strokeWidth={3}
                        />
                      )}
                    </span>
                    <span className="ml-3 text-sm font-medium text-muted-foreground">
                      {label}:{" "}
                      <strong className="text-brand-ink">{value}</strong>
                    </span>
                  </motion.div>
                ))}
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {campaign.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sky-50 px-3 py-2.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-brand-blue/70">
                    Organização
                  </span>
                  <span className="mt-1 block truncate text-sm font-bold text-brand-ink">
                    {campaign.ngoName}
                  </span>
                </div>
                <div className="rounded-2xl bg-amber-50 px-3 py-2.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-amber-700/70">
                    Prazo
                  </span>
                  <span className="mt-1 block text-sm font-bold text-amber-800">
                    {timeLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(campaign);
                }}
                className="tc-button-3d mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white"
              >
                <HandHeart size={18} />
                Conhecer a campanha
                <ArrowUpRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </LayoutGroup>
  );
};

export default FundraiserDisclosureCard;
