import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Download, Plus, X } from "lucide-react";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getNgoCategory } from "@/data/ngoCategories";
import {
  loadDonorBadges,
  mergeCurrentDonationBadge,
  saveSelectedDonorBadges,
  type DonorBadge,
} from "@/lib/donorBadges";
import { formatBRL } from "@/lib/impact";
import { cn } from "@/lib/utils";

type ShareMode = "cause" | "support";
type ShareAspect = "9:16" | "4:5" | "1:1";

interface DonationShareStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ngoName: string;
  ngoCategory: string;
  ngoImage: string;
  ngoPhotos: string[];
  amountCents: number;
  donorId: string | null;
  donorName: string;
  donorUsername: string;
  donorAvatar: string | null;
  friendCode: string;
}

const aspectConfig: Record<ShareAspect, { width: number; height: number }> = {
  "9:16": { width: 360, height: 640 },
  "4:5": { width: 400, height: 500 },
  "1:1": { width: 480, height: 480 },
};

const BRAND_MARK = "/images/tranquilicare-heart-transparent.png";
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TC";

const BrandSignature = () => (
  <div className="flex shrink-0 items-center gap-1.5 text-white/90">
    <img src={BRAND_MARK} alt="" className="size-6 object-contain" />
    <span className="text-[11px] font-bold tracking-[-0.01em]">
      TranquiliCare
    </span>
  </div>
);

export const DonationShareStudio = ({
  open,
  onOpenChange,
  ngoName,
  ngoCategory,
  ngoImage,
  ngoPhotos,
  amountCents,
  donorId,
  donorName,
  donorUsername,
  donorAvatar,
  friendCode,
}: DonationShareStudioProps) => {
  const [mode, setMode] = useState<ShareMode>("cause");
  const [aspect, setAspect] = useState<ShareAspect>("9:16");
  const [exporting, setExporting] = useState(false);
  const [badges, setBadges] = useState<DonorBadge[]>(() =>
    mergeCurrentDonationBadge([], ngoCategory),
  );
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const dimensions = aspectConfig[aspect];
  const previewWidth = Math.min(dimensions.width, 300);
  const previewScale = previewWidth / dimensions.width;
  const previewHeight = dimensions.height * previewScale;
  const categoryDefinition = getNgoCategory(ngoCategory);
  const compact = aspect === "1:1";
  const portrait = aspect === "9:16";
  const photoCount = compact ? 0 : portrait ? 3 : 2;
  const storyPhotos = Array.from(
    { length: photoCount },
    (_, index) => ngoPhotos[index % Math.max(ngoPhotos.length, 1)] || ngoImage,
  );
  const selectedBadges = badges.filter((badge) => badge.selected).slice(0, 3);
  const fileName = useMemo(
    () =>
      `tranquilicare-${mode === "cause" ? "causa" : "meu-apoio"}-${aspect.replace(":", "x")}.png`,
    [aspect, mode],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadDonorBadges(donorId, ngoCategory).then((nextBadges) => {
      if (!cancelled) setBadges(nextBadges);
    });
    return () => {
      cancelled = true;
    };
  }, [donorId, ngoCategory, open]);

  const toggleBadge = (code: string) => {
    setBadges((current) => {
      const selectedCount = current.filter((badge) => badge.selected).length;
      const next = current.map((badge) =>
        badge.code === code
          ? { ...badge, selected: badge.selected ? false : selectedCount < 3 }
          : badge,
      );
      void saveSelectedDonorBadges(
        donorId,
        next.filter((badge) => badge.selected).map((badge) => badge.code),
      );
      return next;
    });
  };
  const createImage = async () => {
    if (!cardRef.current) throw new Error("share-card-unavailable");
    return toPng(cardRef.current, {
      cacheBust: true,
      width: dimensions.width,
      height: dimensions.height,
      pixelRatio: 2,
      backgroundColor: "#38b6ff",
      filter: (node) =>
        !(node instanceof HTMLElement && node.dataset.shareControl === "true"),
    });
  };

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const dataUrl = await createImage();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
      toast.success("Capítulo salvo, pronto para compartilhar!");
    } catch {
      toast.error("Não foi possível criar o capítulo.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-[80] bg-brand-ink/50 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content asChild>
          <motion.section
            className="fixed left-1/2 top-1/2 z-[81] max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-3xl border border-white/60 bg-background p-5 shadow-[0_28px_90px_rgba(8,90,140,0.3)] outline-none sm:p-7"
            style={{ translate: "-50% -50%" }}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, transform: "scale(0.96) translateY(12px)" }
            }
            animate={{ opacity: 1, transform: "scale(1) translateY(0)" }}
            exit={{ opacity: 0, transform: "scale(0.97) translateY(8px)" }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.25,
              ease: EASE_OUT,
            }}
            aria-label="Criar card para compartilhar"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogPrimitive.Title className="font-display text-2xl font-semibold text-brand-ink">
                  Crie seu card
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  Escolha a história e o formato do seu capítulo.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                className="grid size-10 place-items-center rounded-full bg-secondary text-brand-ink transition-transform duration-150 active:scale-[0.97]"
                aria-label="Fechar criação de card"
              >
                <X size={19} />
              </DialogPrimitive.Close>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-5">
                <div
                  className="grid grid-cols-2 gap-2"
                  aria-label="Mensagem do card"
                >
                  <button
                    type="button"
                    aria-pressed={mode === "cause"}
                    onClick={() => setMode("cause")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-bold transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98]",
                      mode === "cause"
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-border bg-secondary text-brand-ink",
                    )}
                  >
                    Compartilhar a causa
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "support"}
                    onClick={() => setMode("support")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-bold transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98]",
                      mode === "support"
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-border bg-secondary text-brand-ink",
                    )}
                  >
                    Compartilhar meu apoio
                  </button>
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-brand-ink">
                    Formato
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(aspectConfig) as ShareAspect[]).map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={aspect === item}
                          onClick={() => setAspect(item)}
                          className={cn(
                            "min-w-16 rounded-full border px-4 py-2 text-sm font-bold transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]",
                            aspect === item
                              ? "border-brand-blue bg-brand-blue text-white"
                              : "border-border bg-background text-brand-ink",
                          )}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {mode === "support" && badges.length > 0 && (
                  <div className="rounded-2xl border border-border bg-secondary/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-brand-ink">
                          Meus Selos
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Escolha até 3 memórias que você gostaria de mostrar
                          pro mundo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setBadgePickerOpen((current) => !current)
                        }
                        className="grid size-9 place-items-center rounded-full bg-brand-blue text-white"
                        aria-label="Escolher selos do card"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    {badgePickerOpen && (
                      <div className="mt-3 grid gap-2">
                        {badges.map((badge) => (
                          <button
                            key={badge.code}
                            type="button"
                            onClick={() => toggleBadge(badge.code)}
                            className="flex items-center gap-3 rounded-xl bg-background p-2 text-left"
                            aria-pressed={badge.selected}
                          >
                            <img
                              src={badge.sealSrc}
                              alt=""
                              className="size-8 object-contain"
                            />
                            <span className="flex-1 text-sm font-semibold text-brand-ink">
                              {badge.label}
                            </span>
                            {badge.selected && (
                              <Check className="size-4 text-brand-blue" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void download()}
                  disabled={exporting}
                  className="tc-button-3d mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  <Download size={17} />
                  {exporting ? "Preparando capítulo..." : "Salvar Capítulo"}
                </button>
              </div>

              <div
                className="mx-auto overflow-hidden rounded-[26px] bg-brand-blue/10 p-3 shadow-inner"
                style={{ width: previewWidth + 24, height: previewHeight + 24 }}
              >
                <div
                  style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <motion.div
                    key={`${mode}-${aspect}`}
                    ref={cardRef}
                    className={cn(
                      "relative flex h-full w-full flex-col overflow-hidden bg-brand-blue text-white",
                      compact ? "p-7" : "p-8",
                    )}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, filter: "blur(5px)" }
                    }
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{
                      duration: reduceMotion ? 0.01 : 0.22,
                      ease: EASE_OUT,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(255,222,89,0.72),transparent_28%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.32),transparent_34%),linear-gradient(150deg,#38b6ff_0%,#22a7f0_60%,#1496dc_100%)]"
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute -right-24 top-1/3 size-56 rounded-full bg-white/16 blur-3xl"
                      aria-hidden="true"
                    />

                    {mode === "cause" ? (
                      <div className="relative flex h-full flex-col">
                        <div className="text-center">
                          <span className="mx-auto grid size-16 place-items-center overflow-hidden rounded-2xl border border-white/55 bg-white/90 shadow-[0_12px_32px_rgba(8,76,119,0.18)]">
                            <img
                              src={ngoImage}
                              alt={`Logo de ${ngoName}`}
                              className="size-14 object-cover"
                            />
                          </span>
                        </div>

                        {storyPhotos.length > 0 && (
                          <div
                            className={cn(
                              "mt-5 flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/45 bg-white/16 p-2 shadow-[0_18px_44px_rgba(9,82,127,0.22)]",
                              portrait ? "h-[126px]" : "h-[154px]",
                            )}
                          >
                            {storyPhotos.map((photo, index) => (
                              <img
                                key={photo + index}
                                src={photo}
                                alt={
                                  "História de " + ngoName + " " + (index + 1)
                                }
                                className="aspect-[4/5] h-full min-h-0 w-auto shrink-0 rounded-xl object-cover"
                              />
                            ))}
                          </div>
                        )}

                        <div className={cn("mt-5", portrait && "mt-7")}>
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "text-balance font-display font-semibold leading-[1.05]",
                                compact ? "text-3xl" : "text-4xl",
                              )}
                            >
                              {ngoName}
                            </p>
                            {categoryDefinition && (
                              <img
                                src={categoryDefinition.sealSrc}
                                alt={"Selo " + categoryDefinition.label}
                                className={cn(
                                  "shrink-0 object-contain drop-shadow-md",
                                  compact ? "size-9" : "size-11",
                                )}
                              />
                            )}
                          </div>
                          <p
                            className={cn(
                              "mt-2 max-w-[28ch] leading-snug text-white/88",
                              compact ? "text-sm" : "text-base",
                            )}
                          >
                            Conheça e venha também fazer parte dessa história.
                          </p>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                          <p className="max-w-[24ch] text-[10px] font-semibold leading-[1.35] text-white/82">
                            Entre com meu{" "}
                            <span className="whitespace-nowrap">
                              código{" "}
                              <strong className="font-black text-brand-yellow">
                                {friendCode}
                              </strong>
                            </span>{" "}
                            e ganhe R$ 10 na primeira doação.
                          </p>
                          <BrandSignature />
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex h-full flex-col">
                        <div className="flex items-center gap-3">
                          {!compact && donorAvatar ? (
                            <img
                              src={donorAvatar}
                              alt={`Foto de perfil de ${donorName}`}
                              className="size-12 rounded-full border-2 border-white/80 object-cover shadow-lg"
                            />
                          ) : (
                            <span
                              aria-label={`Foto de perfil de ${donorName}`}
                              className="grid size-12 place-items-center rounded-full border-2 border-white/80 bg-white text-sm font-black text-brand-blue shadow-lg"
                            >
                              {initialsOf(donorName)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {donorName}
                            </p>
                            <p className="truncate text-xs text-white/74">
                              {donorUsername}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center -space-x-1.5">
                            {selectedBadges.map((badge) => (
                              <img
                                key={badge.code}
                                src={badge.sealSrc}
                                alt={badge.label}
                                className="size-9 rounded-full border-2 border-white/80 object-contain drop-shadow-md"
                              />
                            ))}
                            <button
                              type="button"
                              data-share-control="true"
                              onClick={() => setBadgePickerOpen(true)}
                              className="grid size-8 place-items-center rounded-full border-2 border-white/80 bg-brand-blue text-white shadow-md"
                              aria-label="Adicionar selos ao card"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        </div>

                        <div
                          className={cn("my-auto", compact ? "py-4" : "py-7")}
                        >
                          <p
                            className={cn(
                              "max-w-[12ch] text-balance font-display font-semibold leading-[1.04]",
                              compact ? "text-3xl" : "text-4xl",
                            )}
                          >
                            Fiz uma doação para {ngoName}
                          </p>
                          <p
                            className={cn(
                              "mt-4 font-display font-semibold tracking-[-0.04em]",
                              compact ? "text-4xl" : "text-5xl",
                            )}
                          >
                            {formatBRL(amountCents)}
                          </p>
                          <p className="mt-3 max-w-[28ch] text-sm leading-snug text-white/82">
                            que agora faz parte desta história.
                          </p>
                        </div>

                        <div
                          className={cn(
                            "mb-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-white/35 bg-white/14 p-2.5",
                            compact && "mb-3 p-2",
                          )}
                        >
                          <img
                            src={ngoImage}
                            alt={"Logo de " + ngoName}
                            className={cn(
                              "size-14 shrink-0 rounded-xl bg-white object-cover",
                              compact && "size-11",
                            )}
                          />
                          <div className="min-w-0">
                            <p className="text-xs text-white/72">
                              Meu apoio foi para
                            </p>
                            <p className="truncate text-sm font-bold">
                              {ngoName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-4">
                          <p className="max-w-[24ch] text-[10px] font-semibold leading-[1.35] text-white/82">
                            Entre com meu{" "}
                            <span className="whitespace-nowrap">
                              código{" "}
                              <strong className="font-black text-brand-yellow">
                                {friendCode}
                              </strong>
                            </span>{" "}
                            e ganhe R$ 10 na primeira doação.
                          </p>
                          <BrandSignature />
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.section>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default DonationShareStudio;
