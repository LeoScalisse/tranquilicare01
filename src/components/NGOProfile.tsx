import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Heart,
  Instagram,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { NGO, NGOPost } from "../types";
import {
  startMercadoPagoPixDonation,
  waitForDonationConfirmation,
} from "@/lib/donations";
import { getUser } from "@/lib/auth";
import type { DonationRow } from "@/lib/impact";
import { formatBRL } from "@/lib/impact";
import { getNgoCategory, getNgoCategoryTheme } from "@/data/ngoCategories";
import {
  saveDiscoveryOrigin,
  VERIFICATION_DISCOVERY_PATH,
} from "@/lib/discoveryNavigation";
import DonationAmountWheel from "@/components/ui/donation-amount-wheel";
import DonationThankYouDialog from "@/components/DonationThankYouDialog";
import AppleEdgeGlow from "@/components/ui/apple-edge-glow";
import { PixQrDisclosure } from "@/components/ui/pix-qr-disclosure";
import { PaymentSuccessCheck } from "@/components/ui/payment-success-check";
import ViewOnMap from "@/components/ui/view-on-map";
import donationEnterSound from "@/assets/audio/apple-intelligence-enter.mp3";
import donationExitSound from "@/assets/audio/apple-intelligence-exit.mp3";
import {
  NGOCauseTab,
  NGOImpactTab,
  NGOStoriesTab,
} from "@/components/ngo-profile/NGOProfileTabs";

type ProfileTab = "causa" | "historias" | "impacto";

type DonationCheckoutStage =
  | "amount"
  | "creating"
  | "pix"
  | "confirming"
  | "confirmed";

interface NGOProfileProps {
  ngo: NGO;
  ownerMode?: boolean;
  onEditProfile?: () => void;
}

const getLocationLabel = (address?: string) => {
  if (!address?.trim()) return null;
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(-2).join(", ");
};

const NGOProfile: React.FC<NGOProfileProps> = ({
  ngo,
  ownerMode = false,
  onEditProfile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ProfileTab>("causa");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [zoomedPost, setZoomedPost] = useState<NGOPost | null>(null);
  const [pixPayment, setPixPayment] = useState<Awaited<
    ReturnType<typeof startMercadoPagoPixDonation>
  > | null>(null);
  const [donationCheckoutStage, setDonationCheckoutStage] =
    useState<DonationCheckoutStage>("amount");
  const [isPixExpanded, setIsPixExpanded] = useState(false);
  const [confirmedDonation, setConfirmedDonation] =
    useState<DonationRow | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const donationEnterAudioRef = useRef<HTMLAudioElement>(null);
  const donationExitAudioRef = useRef<HTMLAudioElement>(null);
  const categoryDefinition = getNgoCategory(ngo.category);
  const categoryTheme = getNgoCategoryTheme(ngo.category);
  const sealTriggerId = `ngo-verification-seal-${ngo.id}`;
  const locationLabel = getLocationLabel(ngo.address);

  const amountCents = useMemo(
    () =>
      donationAmount !== null &&
      Number.isFinite(donationAmount) &&
      donationAmount > 0
        ? Math.round(donationAmount * 100)
        : 0,
    [donationAmount],
  );
  const isDonationAmountValid = amountCents >= 51 && amountCents <= 10_000_000;
  const platformFeeCents = Math.round(amountCents * 0.05);
  const totalCents = amountCents + platformFeeCents;

  const playDonationSound = (audio: HTMLAudioElement | null) => {
    if (!audio || import.meta.env.MODE === "test") return;
    audio.currentTime = 0;
    audio.volume = 0.5;
    try {
      const playback = audio.play();
      if (playback) void playback.catch(() => undefined);
    } catch {
      // Audio feedback is optional and must never block the donation flow.
    }
  };

  const openDonation = () => {
    playDonationSound(donationEnterAudioRef.current);
    setPixPayment(null);
    setIsPixExpanded(false);
    setDonationCheckoutStage("amount");
    setShowDonationModal(true);
  };

  const closeDonation = () => {
    if (
      isStartingCheckout ||
      donationCheckoutStage === "confirming" ||
      donationCheckoutStage === "confirmed"
    )
      return;
    playDonationSound(donationExitAudioRef.current);
    setShowDonationModal(false);
  };

  const startPixDonation = async () => {
    if (amountCents < 51 || amountCents > 10_000_000) {
      toast("Escolha um valor entre R$ 0,51 e R$ 100.000,00.");
      return;
    }

    setIsStartingCheckout(true);
    setDonationCheckoutStage("creating");
    try {
      const payment = await startMercadoPagoPixDonation({
        organizationId: ngo.id,
        amountCents,
      });
      setPixPayment(payment);
      setIsPixExpanded(false);
      setDonationCheckoutStage("pix");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setDonationCheckoutStage("amount");
      if (message.includes("not connected") || message.includes("not ready")) {
        toast(message);
      } else {
        toast(
          "Não foi possível gerar o PIX. Confira o valor e tente novamente.",
        );
      }
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const confirmPixDonation = async () => {
    if (!pixPayment || donationCheckoutStage === "confirming") return;

    setDonationCheckoutStage("confirming");
    try {
      const donation = await waitForDonationConfirmation(
        pixPayment.actionId,
        getUser()?.email ?? null,
        pixPayment.confirmationToken ?? null,
      );
      setConfirmedDonation(donation);
      setDonationCheckoutStage("confirmed");
    } catch (error) {
      console.error("Could not confirm PIX donation:", error);
      setDonationCheckoutStage("pix");
      toast(
        "Ainda não identificamos o pagamento. Aguarde alguns instantes e tente novamente.",
      );
    }
  };

  const completePaymentSuccess = () => {
    if (donationCheckoutStage !== "confirmed") return;
    setShowDonationModal(false);
  };

  const finishDonationCelebration = () => setConfirmedDonation(null);

  const createAccountAfterDonation = () => {
    finishDonationCelebration();
    navigate("/donor/auth?mode=signup");
  };
  const copyPhone = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    window.setTimeout(() => setCopiedPhone(false), 2000);
  };

  const openVerificationDiscovery = () => {
    saveDiscoveryOrigin(window.location, sealTriggerId);
    navigate(VERIFICATION_DISCOVERY_PATH, {
      state: {
        hasDiscoveryOrigin: true,
        backgroundLocation: location,
      },
    });
  };

  const instagramUrl = ngo.instagram
    ? `https://www.instagram.com/${ngo.instagram.replace(/^@/, "")}`
    : null;
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: "causa", label: "A Causa" },
    { id: "historias", label: "Histórias" },
    { id: "impacto", label: "Impacto" },
  ];

  const moveTabFocus = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    const nextTab = tabs[nextIndex].id;
    setActiveTab(nextTab);
    window.requestAnimationFrame(() =>
      document.getElementById(`ngo-tab-${ngo.id}-${nextTab}`)?.focus(),
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 pb-24 pt-7 text-brand-ink md:overflow-visible md:pt-10">
      <audio
        ref={donationEnterAudioRef}
        src={donationEnterSound}
        preload="auto"
        aria-hidden="true"
      />
      <audio
        ref={donationExitAudioRef}
        src={donationExitSound}
        preload="auto"
        aria-hidden="true"
      />
      <AnimatePresence>
        {zoomedPost && (
          <motion.div
            className="fixed inset-0 z-[120] grid place-items-center bg-brand-ink/90 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedPost(null)}
          >
            <button
              onClick={() => setZoomedPost(null)}
              className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-background text-brand-blue shadow-lg"
              aria-label="Fechar história"
            >
              <X size={21} />
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`relative w-full overflow-hidden rounded-lg bg-black shadow-2xl ${zoomedPost.type === "video" ? "max-w-sm" : "max-w-lg"}`}
              style={{
                aspectRatio: zoomedPost.type === "video" ? "9/16" : "4/5",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {zoomedPost.type === "video" ? (
                <video
                  src={zoomedPost.url}
                  className="h-full w-full object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={zoomedPost.url}
                  className="h-full w-full object-contain"
                  alt="História ampliada"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 pt-16 text-white">
                <div className="flex items-center gap-3">
                  <img
                    src={ngo.image}
                    className="h-10 w-10 rounded-full border-2 border-white object-cover"
                    alt=""
                  />
                  <span className="font-bold">{ngo.name}</span>
                </div>
                {zoomedPost.caption && (
                  <p className="mt-2 text-sm leading-relaxed text-white/85">
                    {zoomedPost.caption}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showGoalModal && (
        <ModalShell
          onClose={() => setShowGoalModal(false)}
          title="O que queremos tornar possível"
          icon={<Target size={23} />}
          headerClassName={`${categoryTheme.bg} ${categoryTheme.border} ${categoryTheme.text}`}
          iconClassName={categoryTheme.text}
        >
          <p className="leading-relaxed text-muted-foreground">{ngo.goal}</p>
        </ModalShell>
      )}

      {showContactModal && (
        <ModalShell
          onClose={() => setShowContactModal(false)}
          title="Falar com a organização"
          icon={<MessageCircle size={22} />}
        >
          <div className="mb-5 flex items-center gap-3">
            <img
              src={ngo.image}
              className="h-14 w-14 rounded-lg object-cover"
              alt=""
            />
            <div>
              <p className="font-bold">{ngo.name}</p>
              <p className="text-sm text-muted-foreground">{ngo.category}</p>
            </div>
          </div>
          <div className="space-y-2">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-3 font-semibold transition-colors hover:border-brand-blue"
              >
                <Instagram size={19} className="text-brand-blue" />
                <span className="min-w-0 flex-1 truncate">{ngo.instagram}</span>
                <ExternalLink size={15} className="text-muted-foreground" />
              </a>
            )}
            <a
              href={`mailto:${ngo.email}`}
              className="flex items-center gap-3 rounded-lg border border-border p-3 font-semibold transition-colors hover:border-brand-blue"
            >
              <Mail size={19} className="text-brand-blue" />
              <span className="min-w-0 flex-1 truncate">{ngo.email}</span>
              <ExternalLink size={15} className="text-muted-foreground" />
            </a>
            {ngo.phone && (
              <button
                onClick={() => copyPhone(ngo.phone!)}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left font-semibold transition-colors hover:border-brand-blue"
              >
                <Phone size={19} className="text-brand-blue" />
                <span className="flex-1">{ngo.phone}</span>
                {copiedPhone ? (
                  <Check size={17} className="text-emerald-500" />
                ) : (
                  <Copy size={15} className="text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </ModalShell>
      )}

      <AnimatePresence>
        {showDonationModal && (
          <ModalShell
            onClose={closeDonation}
            title={`Apoiar ${ngo.name}`}
            icon={<Heart size={22} />}
            wide
            variant="donation"
            glowStage={
              donationCheckoutStage === "pix" ||
              donationCheckoutStage === "confirming" ||
              donationCheckoutStage === "confirmed"
                ? 4
                : donationCheckoutStage === "creating"
                  ? 3
                  : isDonationAmountValid
                    ? 2
                    : 1
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              {donationCheckoutStage === "confirmed" && confirmedDonation ? (
                <motion.section
                  key="confirmed"
                  className="py-7 text-center"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{
                    duration: reduceMotion ? 0.01 : 0.26,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  aria-live="polite"
                >
                  <PaymentSuccessCheck onComplete={completePaymentSuccess} />
                  <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-brand-ink">
                    Pagamento identificado
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Seu apoio foi confirmado com segurança.
                  </p>
                </motion.section>
              ) : donationCheckoutStage === "confirming" ? (
                <motion.section
                  key="confirming"
                  className="py-10 text-center"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{
                    duration: reduceMotion ? 0.01 : 0.26,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  aria-live="polite"
                  aria-busy="true"
                >
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-blue/10 text-brand-blue">
                    <Loader2 className="animate-spin" size={26} aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 font-display text-2xl font-semibold leading-tight text-brand-ink">
                    Confirmando seu pagamento...
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                    Assim que o PIX for identificado, sua doação será confirmada
                    automaticamente.
                  </p>
                </motion.section>
              ) : donationCheckoutStage === "pix" && pixPayment ? (
                <motion.section
                  key="pix"
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 12, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -8, scale: 0.98 }
                  }
                  transition={{
                    duration: reduceMotion ? 0.01 : 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <h2 className="pr-10 font-display text-2xl font-semibold leading-tight text-brand-ink">
                    {isPixExpanded
                      ? "Pague pelo app do seu banco"
                      : "Seu PIX está pronto."}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {isPixExpanded
                      ? "Escaneie o QR Code ou copie o código PIX."
                      : "Abra o QR Code ou copie o código para concluir o pagamento pelo seu banco."}
                  </p>
                  <PixQrDisclosure
                    className="mt-4"
                    value={pixPayment.qrCodeText}
                    qrCodeImage={pixPayment.qrCode}
                    buttonLabel="Só Abrir QR"
                    onExpandedChange={setIsPixExpanded}
                    onCopy={() => toast("Código PIX copiado.")}
                    onCopyError={() =>
                      toast("Não foi possível copiar o código PIX.")
                    }
                  />
                  <p className="mt-4 text-center text-xs font-semibold leading-5 text-muted-foreground">
                    A doação será confirmada assim que o pagamento for identificado.
                  </p>
                  <AnimatePresence initial={false}>
                    {isPixExpanded && (
                      <motion.button
                        type="button"
                        onClick={() => void confirmPixDonation()}
                        className="tc-button-3d mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                      >
                        <Check size={18} aria-hidden="true" />
                        Pagamento concluído
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPixExpanded(false);
                      setDonationCheckoutStage("amount");
                    }}
                    className="mx-auto mt-4 block text-sm font-bold text-brand-blue underline-offset-4 hover:underline"
                  >
                    Alterar valor
                  </button>
                </motion.section>
              ) : (
                <motion.section
                  key="amount"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{
                    duration: reduceMotion ? 0.01 : 0.22,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <h2 className="mb-4 max-w-sm pr-10 font-display text-xl font-semibold leading-snug text-brand-ink">
                    Quanto você quer fazer chegar à {ngo.name}?
                  </h2>
                  <DonationAmountWheel
                    id="donation-amount"
                    value={donationAmount}
                    onValueChange={setDonationAmount}
                    min={0.51}
                    max={100_000}
                    step={5}
                    label={`Quanto você quer fazer chegar à ${ngo.name}?`}
                  />
                  <div className="mt-5 rounded-lg border border-brand-ink/8 bg-secondary/45 p-4 text-sm">
                    <div>
                      <span className="block font-semibold text-muted-foreground">
                        Sua doação para {ngo.name}
                      </span>
                      <strong className="mt-0.5 block text-base text-brand-ink">
                        {donationAmount === null
                          ? "A definir"
                          : formatBRL(amountCents)}
                      </strong>
                    </div>
                    <div className="mt-3">
                      <span className="block font-semibold text-muted-foreground">
                        Serviço TranquiliCare (5%)
                      </span>
                      <strong className="mt-0.5 block text-base text-brand-ink">
                        {donationAmount === null
                          ? "—"
                          : formatBRL(platformFeeCents)}
                      </strong>
                    </div>
                    <div className="mt-3 border-t border-border pt-3">
                      <span className="block font-bold text-brand-ink">
                        Total
                      </span>
                      <strong className="mt-0.5 block text-lg text-brand-ink">
                        {donationAmount === null ? "—" : formatBRL(totalCents)}
                      </strong>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    A sua intenção chega inteira.
                  </p>
                  <button
                    disabled={isStartingCheckout || !isDonationAmountValid}
                    onClick={() => void startPixDonation()}
                    className="tc-button-3d mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60"
                  >
                    {isStartingCheckout ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CreditCard size={18} />
                    )}
                    {isStartingCheckout
                      ? "Preparando seu PIX..."
                      : donationAmount === null
                        ? "Escolha um valor"
                        : "Continuar"}
                  </button>
                </motion.section>
              )}
            </AnimatePresence>
          </ModalShell>
        )}
      </AnimatePresence>

      {confirmedDonation && !showDonationModal && (
        <DonationThankYouDialog
          open
          amountCents={confirmedDonation.amount}
          ngoName={ngo.name}
          isLoggedIn={Boolean(getUser())}
          onCreateAccount={createAccountAfterDonation}
          onTransferComplete={finishDonationCelebration}
        />
      )}
      {ngo.coverImage && (
        <div className="mb-7 aspect-[16/5] w-full overflow-hidden rounded-lg bg-secondary">
          <img
            src={ngo.coverImage}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <section className="border-b border-border pb-8">
        <div className="flex flex-col gap-7 md:flex-row md:items-center">
          <div className="relative w-fit shrink-0">
            <img
              src={ngo.image}
              className="h-36 w-36 rounded-full border-[5px] border-white object-cover shadow-[0_0_0_3px_hsl(var(--brand-blue))] md:h-40 md:w-40"
              alt={ngo.name}
            />
            {categoryDefinition &&
              (ngo.verified ? (
                <button
                  id={sealTriggerId}
                  type="button"
                  onClick={openVerificationDiscovery}
                  className="absolute -bottom-1 -right-4 grid h-14 w-14 place-items-center rounded-full transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue md:-right-5 md:h-16 md:w-16"
                  aria-label={`Conhecer a verificação da categoria ${categoryDefinition.label}`}
                  title={`Selo verificado de ${categoryDefinition.label}`}
                >
                  <img
                    src={categoryDefinition.sealSrc}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(15,36,60,0.2)]"
                  />
                </button>
              ) : (
                <span
                  className="absolute -bottom-1 -right-4 grid h-14 w-14 place-items-center rounded-full md:-right-5 md:h-16 md:w-16"
                  role="img"
                  aria-label={`Selo da categoria ${categoryDefinition.label}`}
                  title={`Categoria ${categoryDefinition.label}`}
                >
                  <img
                    src={categoryDefinition.sealSrc}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(15,36,60,0.2)]"
                  />
                </span>
              ))}
          </div>

          <div className="min-w-0 flex-1">
            {ownerMode && (
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">
                Perfil da organização
              </p>
            )}
            <p
              className={`text-xs font-bold uppercase tracking-[0.14em] ${categoryTheme.text}`}
            >
              {ngo.category}
              {locationLabel && (
                <>
                  <span
                    className="px-2 text-muted-foreground"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  {locationLabel}
                </>
              )}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">
              {ngo.name}
            </h1>
            <p className="font-narrative mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {ngo.description}
            </p>
            <div className="mt-5 grid w-full gap-3 sm:flex sm:flex-wrap">
              {ownerMode ? (
                <button
                  onClick={onEditProfile}
                  className="tc-button-3d inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white sm:w-auto"
                >
                  <Pencil size={17} />
                  Editar perfil
                </button>
              ) : (
                <button
                  onClick={openDonation}
                  className="tc-button-3d inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white sm:w-auto"
                >
                  <Heart size={17} className="fill-current" />
                  Apoiar esta causa
                </button>
              )}
              <button
                onClick={() => setShowContactModal(true)}
                className="tc-button-neumorph inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-bold transition-colors hover:border-brand-blue hover:text-brand-blue sm:w-auto"
              >
                <MessageCircle size={17} />
                Falar com a organização
              </button>
              {ngo.address && (
                <ViewOnMap
                  locationName={ngo.name}
                  address={ngo.address}
                  latitude={ngo.latitude}
                  longitude={ngo.longitude}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-20 -mx-4 mt-2 border-b border-border bg-background/95 px-4 backdrop-blur md:static md:mx-0 md:mt-0 md:px-0">
        <div className="w-full">
          <div
            role="tablist"
            aria-label="Conteúdo do perfil da organização"
            className="grid w-full grid-cols-3"
          >
            {tabs.map((tab, index) => (
              <button
                id={`ngo-tab-${ngo.id}-${tab.id}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`ngo-panel-${ngo.id}-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => moveTabFocus(event, index)}
                className={`relative min-w-0 px-1 py-4 text-sm font-bold transition-colors sm:px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-blue ${activeTab === tab.id ? "text-brand-blue" : "text-muted-foreground hover:text-brand-ink"}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.span
                    layoutId={`ngo-tab-${ngo.id}`}
                    className="absolute inset-x-2 bottom-0 h-0.5 bg-brand-blue sm:inset-x-4"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          id={`ngo-panel-${ngo.id}-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`ngo-tab-${ngo.id}-${activeTab}`}
          tabIndex={0}
          key={activeTab}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
          className="pt-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
        >
          {activeTab === "causa" && (
            <NGOCauseTab ngo={ngo} onOpenGoal={() => setShowGoalModal(true)} />
          )}
          {activeTab === "historias" && (
            <NGOStoriesTab
              ngo={ngo}
              ownerMode={ownerMode}
              onOpenStory={setZoomedPost}
            />
          )}
          {activeTab === "impacto" && <NGOImpactTab ngo={ngo} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface ModalShellProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  headerClassName?: string;
  iconClassName?: string;
  variant?: "default" | "donation";
  glowStage?: 0 | 1 | 2 | 3 | 4;
}

const ModalShell: React.FC<ModalShellProps> = ({
  title,
  icon,
  children,
  onClose,
  wide,
  headerClassName,
  iconClassName,
  variant = "default",
  glowStage = 0,
}) => {
  const donation = variant === "donation";
  const reduceMotion = useReducedMotion();
  const backdropTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const };
  const dialogTransition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, bounce: 0, duration: 0.3 };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={backdropTransition}
      className={`fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-brand-ink/78 p-5 backdrop-blur-md sm:p-8 ${donation ? "donation-intelligence-frame" : ""}`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <AppleEdgeGlow preview={donation} intensity="xl" stage={glowStage} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={
          reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.975 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }
        }
        transition={dialogTransition}
        className={`relative z-10 my-auto w-full overflow-hidden rounded-lg bg-background shadow-2xl ${wide ? "max-w-md" : "max-w-sm"}`}
      >
        {donation ? (
          <div className="relative max-h-[calc(100svh-2.5rem)] overflow-y-auto rounded-lg bg-background">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-secondary text-brand-blue shadow-sm"
              aria-label="Fechar"
            >
              <X size={19} />
            </button>
            <div className="p-5 md:p-6">{children}</div>
          </div>
        ) : (
          <>
            <div
              className={`flex items-center justify-between border-b px-5 py-4 ${headerClassName || "border-brand-ink bg-brand-ink text-white"}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={iconClassName || "text-brand-yellow"}>
                  {icon}
                </span>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full bg-background text-brand-blue shadow-sm"
                aria-label="Fechar"
              >
                <X size={19} />
              </button>
            </div>
            <div className="p-5 md:p-6">{children}</div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default NGOProfile;
