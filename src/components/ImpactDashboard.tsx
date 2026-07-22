import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, HandCoins, HandHeart, Heart, Loader2, Pencil, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { updateUser } from '@/lib/auth';
import {
  COMMUNITY_STEPS,
  PERSONAL_STEPS,
  ProgressRing,
  formatBRL,
  nextMilestone,
  useCountUp,
  useDonationRows,
} from '@/lib/impact';
import RotatingHeadline from './RotatingHeadline';

interface ImpactDashboardProps {
  userName: string | null;
  userEmail: string | null;
  isLoggedIn: boolean;
  accountType: 'ngo' | 'donor' | null;
  ownedNgoId: string | null;
  verifiedCount: number;
  onLogin: () => void;
  onNameUpdated?: (name: string) => void;
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

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const ImpactDashboard: React.FC<ImpactDashboardProps> = ({
  userName,
  userEmail,
  isLoggedIn,
  accountType,
  ownedNgoId,
  verifiedCount,
  onNameUpdated,
}) => {
  const rows = useDonationRows(userEmail);
  const isNgoAccount = isLoggedIn && accountType === 'ngo';

  // Editable username (logged-in greeting).
  const [displayName, setDisplayName] = useState(userName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setDisplayName(userName ?? '');
  }, [userName]);

  const startEditName = () => {
    setNameDraft(displayName);
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    setSavingName(true);
    try {
      await updateUser({ name: trimmed });
      setDisplayName(trimmed);
      setEditingName(false);
      onNameUpdated?.(trimmed);
      toast.success('Nome atualizado!');
    } catch {
      toast.error('Não foi possível salvar o nome.');
    } finally {
      setSavingName(false);
    }
  };

  const { communityTotal, personalTotal, receivedTotal } = useMemo(() => {
    let community = 0;
    let personal = 0;
    let received = 0;
    for (const d of rows) {
      community += d.amount || 0;
      if (userEmail && d.donor_email === userEmail) personal += d.amount || 0;
      if (ownedNgoId && d.ngo_id === ownedNgoId) received += d.amount || 0;
    }
    return { communityTotal: community, personalTotal: personal, receivedTotal: received };
  }, [rows, userEmail, ownedNgoId]);

  const communityMilestone = nextMilestone(communityTotal, COMMUNITY_STEPS);
  const personalMilestone = nextMilestone(personalTotal, PERSONAL_STEPS);
  const receivedMilestone = nextMilestone(receivedTotal, PERSONAL_STEPS);
  const communityValue = useCountUp(communityTotal);
  const personalValue = useCountUp(personalTotal);
  const receivedValue = useCountUp(receivedTotal);
  const firstName = displayName.trim().split(' ')[0] || null;

  return (
    <section className="relative overflow-hidden">
      <div className="aurora opacity-60" aria-hidden="true" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-10 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {isLoggedIn ? (
            editingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  placeholder="Seu nome de usuário"
                  maxLength={40}
                  className="font-display text-2xl md:text-4xl font-semibold text-brand-ink bg-transparent border-b-2 border-brand-blue outline-none placeholder:text-muted-foreground/40 min-w-0 flex-1 max-w-md"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white shadow-md hover:-translate-y-0.5 transition-transform disabled:opacity-50"
                  aria-label="Salvar nome"
                >
                  {savingName ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-brand-ink transition-colors"
                  aria-label="Cancelar"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
                  {firstName ? (
                    // Name registered → show the name, no generic time-greeting.
                    <span className="text-brand-ink">Olá, {firstName}</span>
                  ) : (
                    // No name yet → keep the generic greeting as a friendly fallback.
                    <>
                      <span className="text-brand-ink">Olá,</span>{' '}
                      <span className="text-muted-foreground/60">{getGreeting()}</span>
                    </>
                  )}
                </h1>
                <button
                  onClick={startEditName}
                  className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-blue transition-colors"
                  aria-label={firstName ? 'Editar seu nome' : 'Adicionar seu nome'}
                  title={firstName ? 'Editar seu nome' : 'Adicionar seu nome'}
                >
                  <Pencil size={16} />
                </button>
              </div>
            )
          ) : (
            <RotatingHeadline className="font-display text-3xl md:text-5xl font-semibold leading-tight text-brand-ink min-h-[2.5rem] md:min-h-[3.75rem]" />
          )}
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
            </div>
          </motion.div>

          {/* Meter 2 — donor: their own donations; NGO: what their NGO received */}
          {isLoggedIn && !isNgoAccount && (
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              animate="show"
              className="bg-brand-blue rounded-3xl p-6 shadow-lg shadow-brand-blue/30 text-white flex items-center gap-5"
            >
              <ProgressRing
                percent={(personalTotal / personalMilestone) * 100}
                trackClass="text-white/20"
                barClass="text-brand-yellow"
                label="Progresso das suas doações"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-50 flex items-center gap-1.5 mb-1">
                  <Heart size={16} className="text-brand-yellow fill-brand-yellow" />
                  Suas doações
                </p>
                <p className="font-display text-2xl md:text-3xl font-semibold truncate">
                  <LiveValue target={personalTotal} value={personalValue} />
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
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white/10">
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
