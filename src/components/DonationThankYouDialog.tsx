import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, HeartHandshake, Share2, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import DonationShareStudio from "@/components/DonationShareStudio";
import Rotating3DStaggerText from "@/components/ui/rotating-3d-stagger-text";
import { formatBRL } from "@/lib/impact";

interface Props {
  open: boolean;
  amountCents: number;
  ngoName: string;
  ngoCategory: string;
  ngoImage: string;
  ngoPhotos: string[];
  donorId: string | null;
  donorName: string;
  donorUsername: string;
  donorAvatar: string | null;
  friendCode: string;
  hasDonorAccount: boolean;
  onCreateAccount: () => void;
  onTransferComplete: () => void;
}

interface Destination {
  x: number;
  y: number;
}

const BRAND_MARK = "/images/tranquilicare-heart-transparent.png";
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const TRANSFER_DURATION_MS = 880;

const DonationThankYouDialog = ({
  open,
  amountCents,
  ngoName,
  ngoCategory,
  ngoImage,
  ngoPhotos,
  donorId,
  donorName,
  donorUsername,
  donorAvatar,
  friendCode,
  hasDonorAccount,
  onCreateAccount,
  onTransferComplete,
}: Props) => {
  const [departing, setDeparting] = useState(false);
  const [shareStudioOpen, setShareStudioOpen] = useState(false);
  const [destination, setDestination] = useState<Destination>({ x: 0, y: 0 });
  const [enteredViaCircle] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.tcDonationSuccessVt === "active",
  );
  const transferTimerRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const motionDuration = reducedMotion ? 0.01 : 0.42;
  const skipSecondaryEntrance = Boolean(reducedMotion || enteredViaCircle);
  const impactTexts = [
    formatBRL(amountCents),
    "2 kits de alimento",
    "1 atendimento veterinário",
    "apoio para mais resgates",
  ];


  useEffect(
    () => () => {
      if (transferTimerRef.current !== null) {
        window.clearTimeout(transferTimerRef.current);
      }
    },
    [],
  );

  const startTransfer = () => {
    if (departing || shareStudioOpen) return;
    const card = document.querySelector<HTMLElement>("[data-donation-card-target]");
    const rect = card?.getBoundingClientRect();
    setDestination({
      x: rect ? rect.left + rect.width / 2 - window.innerWidth / 2 : 0,
      y: rect ? rect.top + rect.height / 2 - window.innerHeight / 2 : 120,
    });
    setDeparting(true);

    if (transferTimerRef.current !== null) {
      window.clearTimeout(transferTimerRef.current);
    }
    transferTimerRef.current = window.setTimeout(
      onTransferComplete,
      reducedMotion ? 80 : TRANSFER_DURATION_MS,
    );
  };

  const entrance = <T extends object>(value: T): false | T =>
    skipSecondaryEntrance ? false : value;

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(nextOpen) => !nextOpen && startTransfer()}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-brand-blue/24 backdrop-blur-xl"
              initial={entrance({ opacity: 0 })}
              animate={{ opacity: departing ? 0 : 1 }}
              transition={{
                duration: reducedMotion ? 0.01 : departing ? 0.72 : 0.3,
                ease: EASE_OUT,
              }}
            />
          </DialogPrimitive.Overlay>

          <DialogPrimitive.Content
            asChild
            onPointerDownOutside={(event) => {
              event.preventDefault();
              startTransfer();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              startTransfer();
            }}
          >
            <motion.section
              className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[500px] overflow-x-hidden overflow-y-auto rounded-3xl border border-white/70 bg-card shadow-[0_28px_90px_rgba(24,155,224,0.3)] outline-none"
              style={{ translate: "-50% -50%", transformOrigin: "center" }}
              initial={entrance({
                opacity: 0,
                transform: "translateY(18px) scale(0.96)",
                borderRadius: 24,
              })}
              animate={
                departing
                  ? {
                      opacity: 1,
                      transform: `translate(${destination.x}px, ${destination.y}px) scale(${reducedMotion ? 0.01 : 0.058})`,
                      borderRadius: 999,
                    }
                  : {
                      opacity: 1,
                      transform: "translate(0px, 0px) scale(1)",
                      borderRadius: 24,
                    }
              }
              transition={{
                duration: departing
                  ? reducedMotion
                    ? 0.08
                    : TRANSFER_DURATION_MS / 1_000
                  : motionDuration,
                ease: EASE_OUT,
              }}
            >
              <motion.div
                className="pointer-events-none absolute inset-0 z-30 bg-brand-yellow"
                initial={{ opacity: 0 }}
                animate={{ opacity: departing ? 1 : 0 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.28 }}
                aria-hidden="true"
              />

              <motion.div
                animate={{ opacity: departing ? 0 : 1 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.2 }}
              >
                <header className="donation-celebration-surface relative overflow-hidden px-7 pb-8 pt-6 text-white sm:px-9">
                  <div className="relative z-[1] flex items-start justify-between gap-5">
                    <motion.div
                      className="flex items-center gap-3"
                      initial={entrance({
                        opacity: 0,
                        transform: "translateX(-12px)",
                      })}
                      animate={{ opacity: 1, transform: "translateX(0px)" }}
                      transition={{
                        duration: motionDuration,
                        delay: skipSecondaryEntrance ? 0 : 0.06,
                        ease: EASE_OUT,
                      }}
                    >
                      <span className="grid size-12 place-items-center rounded-2xl border border-white/55 bg-white/90 shadow-[0_12px_30px_rgba(15,115,171,0.2)]">
                        <img src={BRAND_MARK} alt="" className="size-10 object-contain" />
                      </span>
                      <span>
                        <span className="block text-xs font-bold tracking-[0.1em] text-white/76">
                          TranquiliCare
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white">
                          <Check className="size-4 text-brand-yellow" strokeWidth={3} />
                          DOAÇÃO CONFIRMADA
                        </span>
                      </span>
                    </motion.div>

                  </div>

                  <motion.div
                    className="relative z-[1] mt-8"
                    initial={entrance({
                      opacity: 0,
                      transform: "translateY(10px)",
                    })}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    transition={{
                      duration: motionDuration,
                      delay: skipSecondaryEntrance ? 0 : 0.12,
                      ease: EASE_OUT,
                    }}
                  >
                    <p className="text-sm font-semibold text-white/76">
                      Seu apoio pode se transformar em
                    </p>
                    <Rotating3DStaggerText
                      texts={impactTexts}
                      intervalMs={3_000}
                      className="mt-2 max-w-full font-display font-semibold text-white"
                    />
                    <p className="mt-3 flex items-center gap-2 text-sm text-white/88">
                      <HeartHandshake className="size-4 text-brand-yellow" />
                      para {ngoName}
                    </p>
                  </motion.div>
                </header>

                <div className="px-7 pt-7 sm:px-9">
                  <motion.div
                    initial={entrance({ opacity: 0, transform: "translateY(10px)" })}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    transition={{ duration: motionDuration, delay: skipSecondaryEntrance ? 0 : 0.14, ease: EASE_OUT }}
                  >
                    <DialogPrimitive.Title className="text-balance font-display text-3xl font-semibold leading-tight text-brand-ink">
                      Agora você faz parte desta história. E ela só está começando.
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                      Sua doação foi confirmada. Compartilhe este capítulo com quem também acredita na causa.
                    </DialogPrimitive.Description>
                  </motion.div>

                  {!hasDonorAccount && (
                    <motion.section
                      className="mt-6 rounded-2xl border border-brand-blue/24 bg-brand-blue/10 p-4"
                      initial={entrance({
                        opacity: 0,
                        transform: "translateY(8px)",
                      })}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{
                        duration: motionDuration,
                        delay: skipSecondaryEntrance ? 0 : 0.24,
                        ease: EASE_OUT,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue text-white">
                          <UserPlus className="size-5" />
                        </span>
                        <div>
                          <h3 className="font-semibold text-brand-ink">
                            Guarde esta história com você
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-brand-ink/72">
                            Crie sua conta para acompanhar esta causa, receber novas histórias e manter seu apoio reunido em um só lugar.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onCreateAccount}
                        className="tc-button-3d mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white"
                      >
                        Quero acompanhar
                        <ArrowRight className="size-4" />
                      </button>
                    </motion.section>
                  )}

                  <motion.section
                    className="-mx-7 mt-7 rounded-b-3xl bg-brand-yellow px-7 pb-8 pt-6 sm:-mx-9 sm:px-9"
                    initial={entrance({
                      opacity: 0,
                      transform: "translateY(8px)",
                    })}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    transition={{
                      duration: motionDuration,
                      delay: skipSecondaryEntrance ? 0 : 0.28,
                      ease: EASE_OUT,
                    }}
                  >
                    <h3 className="font-display text-xl font-semibold text-brand-ink">
                      Leve esta causa para mais gente
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShareStudioOpen(true)}
                      className="tc-button-3d mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white"
                    >
                      <Share2 className="size-4" />
                      Compartilhe sua história
                    </button>
                  </motion.section>
                </div>
              </motion.div>
            </motion.section>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DonationShareStudio
        open={shareStudioOpen}
        onOpenChange={setShareStudioOpen}
        ngoName={ngoName}
        ngoCategory={ngoCategory}
        ngoImage={ngoImage}
        ngoPhotos={ngoPhotos}
        amountCents={amountCents}
        donorId={donorId}
        donorName={donorName}
        donorUsername={donorUsername}
        donorAvatar={donorAvatar}
        friendCode={friendCode}
      />
    </>
  );
};

export default DonationThankYouDialog;
