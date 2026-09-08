import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { flushSync } from "react-dom";
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
  confirmSimulatedPixDonation,
  confirmPrototypePixDonation,
  getDonationSimulationStatus,
  type PixPaymentAction,
  type PrototypePixPaymentAction,
  type SimulatedPixPaymentAction,
  startSimulatedPixDonation,
  startPrototypePixDonation,
  startMercadoPagoPixDonation,
  waitForDonationConfirmation,
} from "@/lib/donations";
import { getUser } from "@/lib/auth";
import type { DonationRow } from "@/lib/impact";
import { formatBRL } from "@/lib/impact";
import { getNgoCategory, getNgoCategoryTheme } from "@/data/ngoCategories";
import {
  saveDiscoveryOrigin,
  DONATION_DISCOVERY_PATH,
  VERIFICATION_DISCOVERY_PATH,
} from "@/lib/discoveryNavigation";
import DonationAmountWheel from "@/components/ui/donation-amount-wheel";
import DonationThankYouDialog from "@/components/DonationThankYouDialog";
import ImpactTranslation from "@/components/ImpactTranslation";
import AppleEdgeGlow from "@/components/ui/apple-edge-glow";
import { PixQrDisclosure } from "@/components/ui/pix-qr-disclosure";
import { PaymentSuccessCheck } from "@/components/ui/payment-success-check";
import ViewOnMap from "@/components/ui/view-on-map";
import EmbeddedVideo from "@/components/ui/embedded-video";
import donationCelebrationSound from "@/assets/audio/0807.MP3";
import checkoutStageSound from "@/assets/audio/apple-intelligence-enter.mp3";
import founderSeal from "@/assets/founder-ngo-seal.png";
import { scheduleDonationSuccessAudio } from "@/lib/donationCelebrationAudio";
import { playCheckoutStageAudio } from "@/lib/checkoutStageAudio";
import {
  NGOCauseTab,
  NGOImpactTab,
  NGOStoriesTab,
} from "@/components/ngo-profile/NGOProfileTabs";
import AfterDonationWorkspace from "@/components/ngo-profile/AfterDonationWorkspace";
import { canRenderAfterDonationTab } from "@/lib/afterDonation";
import {
  getTranquiliCarePrototypeRelationships,
  isTranquiliCarePrototypeAccount,
  isTranquiliCarePrototypeOrganization,
} from "@/data/tranquilicarePrototype";

type ProfileTab = "causa" | "historias" | "impacto" | "after_donation";

type DonationCheckoutStage =
  | "amount"
  | "creating"
  | "pix"
  | "confirming"
  | "confirmed";

type DonationViewTransition = {
  finished: Promise<void>;
};

type DonationViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => DonationViewTransition;
};

const isPrototypePixPayment = (
  payment: PixPaymentAction | PrototypePixPaymentAction | SimulatedPixPaymentAction,
): payment is PrototypePixPaymentAction =>
  "isPrototype" in payment && payment.isPrototype === true;

const isSimulatedPixPayment = (
  payment: PixPaymentAction | PrototypePixPaymentAction | SimulatedPixPaymentAction,
): payment is SimulatedPixPaymentAction =>
  "isSimulation" in payment && payment.isSimulation === true;

interface NGOProfileProps {
  ngo: NGO;
  ownerMode?: boolean;
  onEditProfile?: () => void;
}

const NGOProfile: React.FC<NGOProfileProps> = ({
  ngo,
  ownerMode = false,
  onEditProfile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const currentDonor = getUser();
  const isPrototypeDonationTarget =
    !import.meta.env.PROD && isTranquiliCarePrototypeOrganization(ngo);
  const isTranquiliCarePrototype =
    ownerMode && isTranquiliCarePrototypeAccount(currentDonor?.email);
  const isPublicPrototypeDemo =
    isPrototypeDonationTarget && !isTranquiliCarePrototype;
  const [donationSimulationEnabled, setDonationSimulationEnabled] = useState(false);
  const donationsEnabled = donationSimulationEnabled
    || isPrototypeDonationTarget
    || (ngo.donationsEnabled ?? ngo.verified);
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    isPublicPrototypeDemo ? "after_donation" : "causa",
  );
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const payerEmail = getUser()?.email ?? "";
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [zoomedPost, setZoomedPost] = useState<NGOPost | null>(null);
  const [pixPayment, setPixPayment] = useState<
    PixPaymentAction | PrototypePixPaymentAction | SimulatedPixPaymentAction | null
  >(null);
  const [donationCheckoutStage, setDonationCheckoutStage] =
    useState<DonationCheckoutStage>("amount");
  const [isPixExpanded, setIsPixExpanded] = useState(false);
  const [confirmedDonation, setConfirmedDonation] =
    useState<DonationRow | null>(null);
  const donationSuccessAudioRef = useRef<HTMLAudioElement>(null);
  const checkoutStageAudioRef = useRef<HTMLAudioElement>(null);
  const previousGlowStageRef = useRef(0);

  useEffect(() => {
    let active = true;
    void getDonationSimulationStatus().then((enabled) => {
      if (active) setDonationSimulationEnabled(enabled);
    });
    return () => { active = false; };
  }, []);
  const categoryDefinition = getNgoCategory(ngo.category);
  const categoryTheme = getNgoCategoryTheme(ngo.category);
  const sealTriggerId = `ngo-verification-seal-${ngo.id}`;
  const donationIntegrityTriggerId = `ngo-donation-integrity-${ngo.id}`;
  const canSeeAfterDonation = canRenderAfterDonationTab({
    ownerMode,
    accountType: currentDonor?.accountType ?? null,
    currentUserId: currentDonor?.id ?? null,
    organizationId: ngo.id,
  }) || isPrototypeDonationTarget;
  const donorName = currentDonor?.name?.trim() || "Apoiador TranquiliCare";
  const donorUsername =
    currentDonor?.donorProfile?.instagram?.trim() ||
    `@${donorName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.|\.$/g, "")}`;
  const ngoPhotos = useMemo(() => {
    const available = [
      ...ngo.posts.filter((post) => post.type === "image").map((post) => post.url),
    ].filter((photo): photo is string => Boolean(photo));
    return Array.from(
      { length: 3 },
      (_, index) => available[index % Math.max(available.length, 1)] || ngo.image,
    );
  }, [ngo.image, ngo.posts]);
  const friendCodeSource = currentDonor?.id || confirmedDonation?.id || ngo.id;
  const friendCode = `TC-${friendCodeSource
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase()}`;

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
  const normalizedPayerEmail = payerEmail.trim().toLowerCase();
  const platformFeeCents = Math.round(amountCents * 0.05);
  const totalCents = amountCents + platformFeeCents;
  const donationGlowStage: 0 | 1 | 2 | 3 | 4 = !showDonationModal
    ? 0
    : donationCheckoutStage === "pix" ||
        donationCheckoutStage === "confirming" ||
        donationCheckoutStage === "confirmed"
      ? 4
      : donationCheckoutStage === "creating"
        ? 3
        : isDonationAmountValid
          ? 2
          : 1;

  useEffect(() => {
    if (
      donationCheckoutStage !== "confirmed" ||
      import.meta.env.MODE === "test"
    ) {
      return;
    }

    return scheduleDonationSuccessAudio(donationSuccessAudioRef.current);
  }, [donationCheckoutStage]);
  useEffect(() => {
    if (!showDonationModal) {
      previousGlowStageRef.current = 0;
      return;
    }
    if (import.meta.env.MODE === "test") {
      previousGlowStageRef.current = donationGlowStage;
      return;
    }
    previousGlowStageRef.current = playCheckoutStageAudio(
      checkoutStageAudioRef.current,
      previousGlowStageRef.current,
      donationGlowStage,
    );
  }, [donationGlowStage, showDonationModal]);

  const openDonation = () => {
    if (!donationsEnabled) {
      toast('Esta organização ainda está preparando os recebimentos.');
      return;
    }
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
      const payment = isPrototypeDonationTarget
        ? startPrototypePixDonation({
            organizationId: ngo.id,
            amountCents,
            payerEmail: normalizedPayerEmail || undefined,
          })
        : donationSimulationEnabled
          ? startSimulatedPixDonation({
              organizationId: ngo.id,
              amountCents,
            })
          : await startMercadoPagoPixDonation({
              organizationId: ngo.id,
              amountCents,
              payerEmail: normalizedPayerEmail || undefined,
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
      const donorEmail = normalizedPayerEmail || getUser()?.email || null;
      const donation = isPrototypePixPayment(pixPayment)
        ? confirmPrototypePixDonation(pixPayment, donorEmail)
        : isSimulatedPixPayment(pixPayment)
          ? await confirmSimulatedPixDonation(pixPayment, donorEmail)
          : await waitForDonationConfirmation(
              pixPayment.actionId,
              donorEmail,
              pixPayment.confirmationToken ?? null,
            );
      setConfirmedDonation(donation);
      setDonationCheckoutStage("confirmed");
    } catch (error) {
      console.error("Could not confirm PIX donation:", error);
      setDonationCheckoutStage("pix");
      const message = error instanceof Error ? error.message : "";
      toast(message.includes("donor-account-required")
        ? "Entre com uma conta de doador para registrar esta simulação."
        : "Ainda não identificamos o pagamento. Aguarde alguns instantes e tente novamente.");
    }
  };

  const completePaymentSuccess = () => {
    if (donationCheckoutStage !== "confirmed") return;

    const revealThankYou = () => {
      flushSync(() => setShowDonationModal(false));
    };
    const transitionDocument = document as DonationViewTransitionDocument;

    if (reduceMotion || !transitionDocument.startViewTransition) {
      revealThankYou();
      return;
    }

    document.documentElement.dataset.tcDonationSuccessVt = "active";
    const transition = transitionDocument.startViewTransition(revealThankYou);
    void transition.finished.finally(() => {
      delete document.documentElement.dataset.tcDonationSuccessVt;
    });
  };

  const finishDonationCelebration = () => setConfirmedDonation(null);

  const createAccountAfterDonation = () => {
    finishDonationCelebration();
    navigate("/donor/auth?mode=signup");
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

  const openDonationIntegrityDiscovery = () => {
    saveDiscoveryOrigin(window.location, donationIntegrityTriggerId);
    navigate(DONATION_DISCOVERY_PATH, {
      state: {
        hasDiscoveryOrigin: true,
        backgroundLocation: location,
      },
    });
  };

  const instagramUrl = ngo.instagram
    ? `https://www.instagram.com/${ngo.instagram.replace(/^@/, "")}`
    : null;
  const whatsappDigits = ngo.phone?.replace(/\D/g, '') ?? '';
  const whatsappUrl = whatsappDigits
    ? 'https://wa.me/' + (whatsappDigits.startsWith('55') ? whatsappDigits : '55' + whatsappDigits)
    : null;
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: "causa", label: "A Causa" },
    { id: "historias", label: "Histórias" },
    { id: "impacto", label: "Impacto" },
    ...(canSeeAfterDonation
      ? [{
        id: "after_donation" as const,
        label: isPublicPrototypeDemo ? "Painel demonstrativo" : "Depois da doação",
      }]
      : []),
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
        ref={donationSuccessAudioRef}
        src={donationCelebrationSound}
        preload="auto"
        aria-hidden="true"
      />
      <audio
        ref={checkoutStageAudioRef}
        src={checkoutStageSound}
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
              style={zoomedPost.type === "video" ? { aspectRatio: "9/16" } : undefined}
              onClick={(event) => event.stopPropagation()}
            >
              {zoomedPost.type === "video" ? (
                <video
                  src={zoomedPost.url}
                  className="block h-auto max-h-[88vh] w-full object-contain"
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
            <button
              type='button'
              onClick={() => {
                const target = '/chats?organization=' + ngo.id;
                navigate(currentDonor ? target : '/donor/auth?mode=login&redirect=' + encodeURIComponent(target));
              }}
              className='flex w-full items-center gap-3 rounded-lg bg-brand-blue p-3 text-left font-semibold text-white shadow-[0_8px_20px_rgba(55,181,247,0.2)] transition-colors hover:bg-brand-blue/90'
            >
              <MessageCircle size={19} />
              <span className='min-w-0 flex-1'>Conversar no TranquiliCare</span>
              <ExternalLink size={15} className='text-white/80' />
            </button>
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
            {ngo.email && (
              <a
                href={`mailto:${ngo.email}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 font-semibold transition-colors hover:border-brand-blue"
              >
                <Mail size={19} className="text-brand-blue" />
                <span className="min-w-0 flex-1 truncate">{ngo.email}</span>
                <ExternalLink size={15} className="text-muted-foreground" />
              </a>
            )}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left font-semibold transition-colors hover:border-brand-blue"
              >
                <Phone size={19} className="text-brand-blue" />
                <span className="flex-1">{ngo.phone}</span>
                <ExternalLink size={15} className="text-muted-foreground" />
              </a>
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
            glowStage={donationGlowStage}
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
                    Só um instante. Estamos confirmando seu PIX.
                  </h2>
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
                  {!isPixExpanded && (
                    <>
                      <h2 className="pr-10 font-display text-2xl font-semibold leading-tight text-brand-ink">
                        PIX PRONTO
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Tudo pronto para concluir sua doação.
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Abra o QR Code ou copie o código PIX para pagar pelo app do seu banco.
                      </p>
                    </>
                  )}
                  {(isPrototypePixPayment(pixPayment) || isSimulatedPixPayment(pixPayment)) && (
                    <div className="mt-4 rounded-xl border border-brand-yellow/50 bg-brand-yellow/10 px-4 py-3 text-sm text-brand-ink">
                      <strong className="block font-bold">PIX de demonstração</strong>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        Nenhuma cobrança será realizada. Este apoio será identificado como teste.
                      </span>
                    </div>
                  )}
                  <PixQrDisclosure
                    className="mt-4"
                    value={pixPayment.qrCodeText}
                    qrCodeImage={pixPayment.qrCode}
                    buttonLabel="Ver PIX"
                    onExpandedChange={setIsPixExpanded}
                    onCopy={() => toast("Código PIX copiado.")}
                    onCopyError={() =>
                      toast("Não foi possível copiar o código PIX.")
                    }
                  />
                  {isPixExpanded && (
                    <p className="mt-4 text-center text-xs font-semibold leading-5 text-muted-foreground">
                      Sua doação será confirmada automaticamente assim que o pagamento for identificado.
                    </p>
                  )}
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
                    <button
                      id={donationIntegrityTriggerId}
                      type="button"
                      onClick={openDonationIntegrityDiscovery}
                      className="block w-full rounded-md text-left outline-none transition-colors hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue/40"
                      aria-label="Entender como 100% da doação chega à organização"
                    >
                      <span className="block font-semibold text-muted-foreground">
                        Sua doação para {ngo.name}
                      </span>
                      <strong className="mt-0.5 block text-base text-brand-ink">
                        {donationAmount === null
                          ? "A definir"
                          : formatBRL(amountCents)}
                      </strong>
                    </button>
                    <div className="mt-3">
                      <span className="block font-semibold text-muted-foreground">
                        TranquiliCare · 5%
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
                  <p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">
                    {donationAmount === null ? (
                      "Escolha um valor para ver como sua doação chega à organização."
                    ) : (
                      <>Os <strong className="font-bold text-brand-ink">{formatBRL(amountCents)}</strong> que você escolheu chegam à organização. O valor do TranquiliCare é adicionado separadamente.</>
                    )}
                  </p>
                  {donationAmount !== null && isDonationAmountValid && <ImpactTranslation organizationId={ngo.id} category={ngo.category} amountCents={amountCents} />}
                  <button
                    disabled={
                      isStartingCheckout ||
                      !isDonationAmountValid
                    }
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
          organizationId={ngo.id}
          ngoName={ngo.name}
          ngoCategory={ngo.category}
          ngoImage={ngo.image}
          ngoPhotos={ngoPhotos}
          donorName={donorName}
          donorUsername={donorUsername}
          donorAvatar={currentDonor?.avatar ?? null}
          donorId={currentDonor?.id ?? null}
          friendCode={friendCode}
          hasDonorAccount={Boolean(confirmedDonation.donor_id)}
          onCreateAccount={createAccountAfterDonation}
          onTransferComplete={finishDonationCelebration}
        />
      )}
      <section className="rounded-[30px] border border-brand-ink/10 bg-white p-5 shadow-[0_24px_60px_-44px_rgba(15,54,79,0.55)] sm:p-7 md:p-8">
        <div className="flex flex-col gap-7 md:flex-row md:items-center">
          <div className="relative w-fit shrink-0">
            <img
              src={ngo.image}
              className="h-32 w-32 rounded-[28px] border border-brand-ink/10 bg-secondary object-cover p-1 shadow-[0_16px_34px_-24px_rgba(15,54,79,0.5)] md:h-40 md:w-40 md:rounded-[34px]"
              alt={ngo.name}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {categoryDefinition ? (
                <button
                  id={sealTriggerId}
                  type="button"
                  onClick={openVerificationDiscovery}
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${categoryTheme.border} ${categoryTheme.text}`}
                  aria-label={`Conhecer a verificação da categoria ${categoryDefinition.label}`}
                  title={`Selo da categoria ${categoryDefinition.label}`}
                >
                  <img src={categoryDefinition.sealSrc} alt={`Selo da categoria ${categoryDefinition.label}`} className="h-7 w-7 object-contain" />
                  {ngo.category}
                </button>
              ) : (
                <span className={`text-xs font-bold uppercase tracking-[0.14em] ${categoryTheme.text}`}>{ngo.category}</span>
              )}
              {ngo.isFounder && (
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-yellow bg-brand-yellow/20 px-2.5 py-1 text-xs font-bold text-brand-ink" role="img" aria-label="Selo de ONG fundadora" title="ONG fundadora">
                  <img src={founderSeal} alt="" className="h-7 w-7 object-contain" />
                  ONG fundadora
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
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
                  disabled={!donationsEnabled}
                  className="tc-button-3d inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                >
                  <Heart size={17} className="fill-current" />
                  {donationsEnabled ? 'Apoiar esta causa' : 'Recebimentos em preparação'}
                </button>
              )}
              {!ownerMode && (
                <button
                onClick={() => setShowContactModal(true)}
                className="tc-button-neumorph inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-bold transition-colors hover:border-brand-blue hover:text-brand-blue sm:w-auto"
              >
                <MessageCircle size={17} />
                Falar com a organização
                </button>
              )}
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

      <div className="sticky top-16 z-20 -mx-4 mt-4 bg-background/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:px-0">
        <div className="w-full">
          <div
            role="tablist"
            aria-label="Conteúdo do perfil da organização"
            className="grid w-full gap-1 rounded-[18px] border border-brand-ink/10 bg-secondary/60 p-1.5"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
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
                className={`relative min-w-0 rounded-[13px] px-1 py-3 text-sm font-bold transition-[color,background-color,box-shadow] sm:px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue ${activeTab === tab.id ? "bg-white text-brand-blue shadow-sm" : "text-muted-foreground hover:text-brand-ink"}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.span
                    layoutId={`ngo-tab-${ngo.id}`}
                    className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-brand-blue"
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
          {activeTab === "after_donation" && canSeeAfterDonation && (
            <AfterDonationWorkspace
              organizationId={ngo.id}
              initialRelationships={
                isPrototypeDonationTarget
                  ? getTranquiliCarePrototypeRelationships(ngo.id)
                  : undefined
              }
              demoMode={isPublicPrototypeDemo}
              onOpenChat={(profileId) => navigate(`/chats?profile=${profileId}`)}
            />
          )}
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
