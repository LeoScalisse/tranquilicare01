import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { HandCoins, HandHeart, Heart, ShieldCheck } from 'lucide-react';
import {
  COMMUNITY_STEPS,
  PERSONAL_STEPS,
  ProgressRing,
  DonationRow,
  formatBRL,
  nextMilestone,
  useCountUp,
  useDonationImpact,
} from '@/lib/impact';
import DonationCardCelebration from './DonationCardCelebration';
import LoggedOutHero from './LoggedOutHero';

interface ImpactDashboardProps {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  isLoggedIn: boolean;
  accountType: 'ngo' | 'donor' | null;
  ownedNgoId: string | null;
  verifiedCount: number;
  onLogin: () => void;
  onExplore: () => void;
  onStories: () => void;
  onVerificationDiscovery: () => void;
  onDonationDiscovery: () => void;
  celebratingDonation?: DonationRow | null;
  celebrationPhase: 'idle' | 'card' | 'dialog';
  onDonationAnimationComplete: () => void;
}

/** Tesla-style live number: re-pops softly every time the target grows. */
const LiveValue: React.FC<{ target: number; value: number; className?: string }> = ({ target, value, className }) => (
  <motion.span
    key={target}
    initial={{ scale: 1.06 }}
    animate={{ scale: 1 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className={`inline-block ${className ?? ''}`}
  >
    {formatBRL(value)}
  </motion.span>
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'bom dia!';
  if (h < 18) return 'boa tarde!';
  return 'boa noite!';
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const ImpactDashboard: React.FC<ImpactDashboardProps> = ({
  userId,
  userName,
  userEmail,
  isLoggedIn,
  accountType,
  ownedNgoId,
  verifiedCount,
  onExplore,
  onStories,
  onVerificationDiscovery,
  onDonationDiscovery,
  celebratingDonation = null,
  celebrationPhase,
  onDonationAnimationComplete,
}) => {
  const { rows, communityTotal, communityDonationCount } = useDonationImpact(
    userId,
    userEmail,
    celebratingDonation,
  );
  const isNgoAccount = isLoggedIn && accountType === 'ngo';
  const [releasedDonationId, setReleasedDonationId] = useState<string | null>(null);

  const { personalTotal, receivedTotal } = useMemo(() => {
    let personal = 0;
    let received = 0;
    for (const d of rows) {
      if (userEmail && d.donor_email === userEmail) personal += d.amount || 0;
      if (ownedNgoId && d.ngo_id === ownedNgoId) received += d.amount || 0;
    }
    return { personalTotal: personal, receivedTotal: received };
  }, [rows, userEmail, ownedNgoId]);

  useEffect(() => {
    if (celebratingDonation) setReleasedDonationId(null);
  }, [celebratingDonation]);

  const releasePersonalImpact = useCallback(() => {
    if (celebratingDonation) setReleasedDonationId(celebratingDonation.id);
  }, [celebratingDonation]);

  const holdPersonalDonation = Boolean(
    celebratingDonation
    && userId
    && celebratingDonation.donor_id === userId
    && releasedDonationId !== celebratingDonation.id,
  );
  const displayedPersonalTotal = holdPersonalDonation
    ? Math.max(0, personalTotal - (celebratingDonation?.amount ?? 0))
    : personalTotal;

  const communityMilestone = nextMilestone(communityTotal, COMMUNITY_STEPS);
  const personalMilestone = nextMilestone(displayedPersonalTotal, PERSONAL_STEPS);
  const receivedMilestone = nextMilestone(receivedTotal, PERSONAL_STEPS);
  const communityValue = useCountUp(communityTotal);
  const personalValue = useCountUp(displayedPersonalTotal);
  const receivedValue = useCountUp(receivedTotal);
  const firstName = userName?.trim().split(' ')[0] || null;

  if (!isLoggedIn) {
    return (
      <LoggedOutHero
        communityTotal={communityTotal}
        communityDonationCount={communityDonationCount}
        onExplore={onExplore}
        onStories={onStories}
        onVerificationDiscovery={onVerificationDiscovery}
        onDonationDiscovery={onDonationDiscovery}
      />
    );
  }

  return (
    <section className="relative overflow-hidden">
      <div className="aurora opacity-60" aria-hidden="true" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-10 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
            {firstName ? <span className="text-brand-ink">Olá, {firstName}</span> : <><span className="text-brand-ink">Olá,</span>{' '}<span className="text-muted-foreground/60">{getGreeting()}</span></>}
          </h1>
        </motion.div>

        <div className={`grid gap-4 md:gap-5 mt-8 ${isLoggedIn ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {/* Meter 1 — platform-wide donations */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-lg hover:shadow-brand-blue/10 transition-shadow duration-300 flex items-center gap-5"
          >
            <ProgressRing
              percent={(communityTotal / communityMilestone) * 100}
              trackClass="text-brand-blue/10"
              barClass="text-brand-blue"
              label="Progresso das doações da comunidade"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                <HandCoins size={16} className="text-brand-blue" />
                Doado pela comunidade
              </p>
              <p className="font-display text-2xl md:text-3xl font-semibold text-brand-ink truncate">
                <LiveValue target={communityTotal} value={communityValue} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rumo a <span className="font-bold text-brand-ink">{formatBRL(communityMilestone)}</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-brand-blue">
                {communityDonationCount} {communityDonationCount === 1 ? 'doação confirmada' : 'doações confirmadas'}
              </p>
            </div>
          </motion.div>

          {/* Meter 2 — donor: their own donations; NGO: what their NGO received */}
          {isLoggedIn && !isNgoAccount && (
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              animate="show"
              data-donation-card-target
              className="relative isolate overflow-hidden bg-brand-blue rounded-3xl p-6 shadow-lg shadow-brand-blue/30 text-white flex items-center gap-5"
            >
              <DonationCardCelebration
                active={Boolean(celebratingDonation) && celebrationPhase === 'card'}
                amountCents={celebratingDonation?.amount ?? 0}
                celebrationKey={celebratingDonation?.id ?? null}
                onValueRelease={releasePersonalImpact}
                onComplete={onDonationAnimationComplete}
              />
              <div className="relative z-20 shrink-0">
                <ProgressRing
                  percent={(displayedPersonalTotal / personalMilestone) * 100}
                  trackClass="text-white/20"
                  barClass="text-brand-yellow"
                  label="Progresso das suas doações"
                />
              </div>
              <div className="relative z-20 min-w-0">
                <p className="text-sm font-semibold text-blue-50 flex items-center gap-1.5 mb-1">
                  <Heart size={16} className="text-brand-yellow fill-brand-yellow" />
                  Suas doações
                </p>
                <p className="font-display text-2xl md:text-3xl font-semibold truncate">
                  <LiveValue target={displayedPersonalTotal} value={personalValue} />
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  Próximo marco: <span className="font-bold text-white">{formatBRL(personalMilestone)}</span>
                </p>
              </div>
            </motion.div>
          )}

          {isNgoAccount && (
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              animate="show"
              className="bg-brand-yellow rounded-3xl p-6 shadow-lg shadow-brand-yellow/40 text-brand-ink flex items-center gap-5"
            >
              <ProgressRing
                percent={(receivedTotal / receivedMilestone) * 100}
                trackClass="text-brand-ink/10"
                barClass="text-brand-ink"
                label="Progresso do recebido pela sua ONG"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-ink/70 flex items-center gap-1.5 mb-1">
                  <HandHeart size={16} className="text-brand-ink" />
                  Recebido pela sua ONG
                </p>
                <p className="font-display text-2xl md:text-3xl font-semibold truncate">
                  <LiveValue target={receivedTotal} value={receivedValue} />
                </p>
                <p className="text-xs text-brand-ink/60 mt-1">
                  {receivedTotal > 0 ? (
                    <>Próxima meta: <span className="font-bold text-brand-ink">{formatBRL(receivedMilestone)}</span></>
                  ) : (
                    <>Compartilhe sua página para receber apoios</>
                  )}
                </p>
              </div>
            </motion.div>
          )}

          {/* Verified NGOs stat */}
          <motion.div
            custom={isLoggedIn ? 2 : 1}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="bg-brand-ink rounded-3xl p-6 shadow-lg text-white flex items-center gap-5"
          >
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-background/10">
              <ShieldCheck size={34} className="text-brand-yellow" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/70 mb-1">ONGs verificadas</p>
              <p className="font-display text-2xl md:text-3xl font-semibold">{verifiedCount}</p>
              <p className="text-xs text-white/60 mt-1">prontas para receber seu apoio</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ImpactDashboard;
