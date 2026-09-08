import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'framer-motion';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  HandHeart,
  Loader2,
  Plus,
  Target,
} from 'lucide-react';

import cowHead from '@/assets/cow-head.png';
import ImpactTranslation from '@/components/ImpactTranslation';
import { loadPublicCampaigns, type PublicCampaign } from '@/lib/campaigns';
import type { NGO } from '@/types';

interface CampaignShowcaseSectionProps {
  ngos: NGO[];
  onCreate: () => void;
  onOpenOrganization: (ngo: NGO) => void;
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);

const remainingLabel = (endsAt: string | null) => {
  if (!endsAt) return 'Prazo em definição';
  const remaining = new Date(endsAt).getTime() - Date.now();
  if (remaining <= 0) return 'Encerrada';
  const days = Math.ceil(remaining / 86_400_000);
  return 'Faltam ' + days + ' ' + (days === 1 ? 'dia' : 'dias');
};

const CampaignDisclosureCard: React.FC<{
  campaign: PublicCampaign;
  organization?: NGO;
  onOpen?: () => void;
}> = ({ campaign, organization, onOpen }) => {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const progress = campaign.goalAmountCents > 0
    ? Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100))
    : 0;
  const missing = Math.max(0, campaign.goalAmountCents - campaign.raisedAmountCents);
  const cover = campaign.coverUrl || campaign.organizationCoverImage || campaign.organizationImage;
  const timeLabel = remainingLabel(campaign.endsAt);
  const transition = reduceMotion
    ? { duration: 0.01 }
    : { type: 'spring' as const, bounce: 0.08, duration: 0.38 };

  const toggleExpanded = () => setExpanded((current) => !current);

  return (
    <LayoutGroup id={'campaign-' + campaign.id}>
      <motion.article
        layout
        initial={false}
        transition={transition}
        onClick={toggleExpanded}
        onKeyDown={(event) => {
          if (event.currentTarget === event.target && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            toggleExpanded();
          }
        }}
        role='button'
        tabIndex={0}
        className={'relative flex min-h-[220px] w-[86vw] max-w-[440px] shrink-0 cursor-pointer flex-col overflow-hidden border-2 border-brand-ink/10 bg-white shadow-[0_18px_50px_-30px_rgba(13,45,65,0.62)] outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30 ' + (expanded ? 'rounded-[26px] p-5 sm:p-[22px]' : 'rounded-[20px] p-4')}
        aria-expanded={expanded}
        aria-label={campaign.title + '. ' + progress + '% da meta. ' + (expanded ? 'Ocultar detalhes' : 'Mostrar detalhes')}
      >
        <div className='relative z-10 flex items-center justify-between gap-2'>
          <motion.div layout='position' transition={transition} className={'flex min-w-0 items-center gap-2 rounded-3xl py-0.5 pl-1.5 pr-2 ' + (expanded ? 'bg-transparent' : 'bg-secondary/65')}>
            <motion.img
              layoutId={'campaign-image-' + campaign.id}
              src={cover}
              alt=''
              loading='lazy'
              decoding='async'
              className={'shrink-0 border-2 border-white object-cover shadow-sm ' + (expanded ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl')}
            />
            <motion.h3 layout='position' transition={transition} className={'truncate font-display font-semibold text-brand-ink ' + (expanded ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg')}>
              {campaign.title}
            </motion.h3>
          </motion.div>

          <AnimatePresence mode='popLayout' initial={false}>
            {!expanded && (
              <motion.div
                key='collapsed-progress'
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateX(10px) scale(0.94)' }}
                animate={{ opacity: 1, transform: 'translateX(0) scale(1)' }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateX(10px) scale(0.94)' }}
                className='flex shrink-0 items-center gap-2'
              >
                <motion.div layoutId={'campaign-progress-container-' + campaign.id} className='relative h-2 w-16 overflow-hidden rounded-full bg-secondary sm:w-24'>
                  <motion.div layoutId={'campaign-progress-fill-' + campaign.id} className='h-full rounded-full bg-brand-blue' style={{ width: Math.max(progress, 2) + '%' }} />
                </motion.div>
                <motion.span layoutId={'campaign-progress-text-' + campaign.id} className='text-sm font-bold text-brand-blue'>
                  {progress}%
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {!expanded && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0)' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
              className='mt-5 rounded-2xl border border-brand-ink/5 bg-secondary/40 p-3'
            >
              <p className='line-clamp-2 text-sm leading-5 text-muted-foreground'>{campaign.description}</p>
              <div className='mt-3 flex items-center justify-between border-t border-brand-ink/5 pt-3 text-xs'>
                <span className='font-semibold text-muted-foreground'>Meta da vaquinha</span>
                <span className='font-bold text-brand-ink'>{formatMoney(campaign.goalAmountCents)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode='popLayout' initial={false}>
          {!expanded && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(5px)' }}
              animate={{ opacity: 1, transform: 'translateY(0)' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(5px)' }}
              className='mt-auto flex items-center justify-between gap-3 px-1 pt-4 text-xs font-semibold text-muted-foreground'
            >
              <span className='flex min-w-0 items-center gap-1.5 truncate'><Building2 size={15} className='shrink-0' />{campaign.organizationName}</span>
              <span className='flex shrink-0 items-center gap-1.5'><Clock3 size={15} />{timeLabel}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode='popLayout' initial={false}>
          {expanded && (
            <motion.div
              layout
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-18px)' }}
              animate={{ opacity: 1, transform: 'translateY(0)' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-12px)' }}
              className='mt-6 origin-top'
            >
              <div className='mb-7 flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/45 px-2.5 py-1.5'>
                <Target size={18} className='text-brand-blue' />
                <motion.div layoutId={'campaign-progress-container-' + campaign.id} className='h-2 w-24 overflow-hidden rounded-full bg-secondary sm:w-28'>
                  <motion.div layoutId={'campaign-progress-fill-' + campaign.id} className='h-full rounded-full bg-brand-blue' style={{ width: Math.max(progress, 2) + '%' }} />
                </motion.div>
                <motion.span layoutId={'campaign-progress-text-' + campaign.id} className='text-sm font-bold text-brand-blue'>{progress}%</motion.span>
              </div>

              <div className='grid gap-2 text-sm'>
                {[
                  ['Arrecadado', formatMoney(campaign.raisedAmountCents), campaign.raisedAmountCents > 0],
                  ['Meta da vaquinha', formatMoney(campaign.goalAmountCents), progress >= 100],
                  ['Falta arrecadar', formatMoney(missing), missing === 0],
                ].map(([label, value, completed]) => (
                  <div key={String(label)} className='flex items-center gap-3 rounded-xl bg-secondary/45 px-3 py-2.5'>
                    <span className={'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ' + (completed ? 'border-brand-blue bg-brand-blue' : 'border-brand-ink/15 bg-white')}>
                      {completed && <Check size={12} className='text-white' strokeWidth={3} />}
                    </span>
                    <span className='text-muted-foreground'>{label}: <strong className='text-brand-ink'>{value}</strong></span>
                  </div>
                ))}
              </div>

              <p className='mt-5 text-sm leading-6 text-muted-foreground'>{campaign.description}</p>
              {organization && campaign.raisedAmountCents > 0 && (
                <ImpactTranslation organizationId={organization.id} category={organization.category} amountCents={campaign.raisedAmountCents} variant='campaign' />
              )}
              <button
                type='button'
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen?.();
                }}
                disabled={!onOpen}
                className='tc-button-3d mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55'
              >
                <HandHeart size={18} />
                Conhecer e apoiar
                <ArrowUpRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </LayoutGroup>
  );
};

const EmptyCampaignCard: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <article className='flex min-h-[220px] w-[86vw] max-w-[440px] shrink-0 flex-col rounded-[20px] border-2 border-dashed border-brand-blue/20 bg-white/95 p-4 shadow-[0_18px_50px_-30px_rgba(13,45,65,0.52)]'>
    <div className='flex items-center gap-2'>
      <span className='grid h-10 w-10 place-items-center rounded-xl bg-brand-blue text-white'><Plus size={20} /></span>
      <h3 className='font-display text-base font-semibold text-brand-ink sm:text-lg'>Sua causa pode aparecer aqui</h3>
    </div>
    <div className='mt-5 rounded-2xl bg-secondary/50 p-3'>
      <p className='text-sm leading-5 text-muted-foreground'>Conte uma história, defina a meta e envie a proposta para análise do TranquiliCare.</p>
      <div className='mt-3 h-2 overflow-hidden rounded-full bg-secondary'><span className='block h-full w-[8%] rounded-full bg-brand-yellow' /></div>
    </div>
    <div className='mt-auto flex items-center justify-between pt-4 text-xs font-semibold text-muted-foreground'>
      <span>Proposta analisada antes de publicar</span>
      <CalendarDays size={15} />
    </div>
    <button type='button' onClick={onCreate} className='mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-bold text-white transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70'>
      Criar minha vaquinha <ArrowUpRight size={16} />
    </button>
  </article>
);

const CowSpot = ({ className }: { className: string }) => (
  <span aria-hidden='true' className={'pointer-events-none absolute bg-black ' + className} />
);

const CampaignShowcaseSection: React.FC<CampaignShowcaseSectionProps> = ({
  ngos,
  onCreate,
  onOpenOrganization,
}) => {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadCampaigns = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    void loadPublicCampaigns()
      .then(setCampaigns)
      .catch(() => {
        setCampaigns([]);
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const cards = useMemo(() => campaigns.map((campaign) => ({
    campaign,
    ngo: ngos.find((ngo) => ngo.id === campaign.organizationId),
  })), [campaigns, ngos]);

  return (
    <section
      data-cow-campaign-section
      className='relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] border border-brand-ink/10 bg-white pb-9 pt-16 shadow-[0_18px_45px_-36px_rgba(13,45,65,0.5)] md:rounded-[34px] md:pt-[4.5rem]'
      aria-labelledby='campaigns-title'
    >
      <CowSpot className='-left-10 top-8 h-24 w-40 rotate-[-18deg] rounded-[48%_52%_42%_58%]' />
      <CowSpot className='left-[18%] top-5 h-12 w-20 rotate-[12deg] rounded-[58%_42%_64%_36%]' />
      <CowSpot className='right-[20%] top-10 h-16 w-28 rotate-[-14deg] rounded-[44%_56%_38%_62%]' />
      <CowSpot className='-right-8 top-[34%] h-24 w-36 rotate-[18deg] rounded-[62%_38%_48%_52%]' />
      <CowSpot className='left-[43%] top-[42%] h-16 w-24 rotate-[-10deg] rounded-[62%_38%_54%_46%]' />
      <CowSpot className='bottom-7 left-[8%] h-20 w-32 rotate-[8deg] rounded-[38%_62%_57%_43%]' />
      <CowSpot className='bottom-5 left-[61%] h-14 w-24 rotate-[-20deg] rounded-[56%_44%_35%_65%]' />
      <CowSpot className='-right-8 bottom-10 h-32 w-48 rotate-[16deg] rounded-[55%_45%_60%_40%]' />

      <img
        data-cow-head
        src={cowHead}
        alt=''
        aria-hidden='true'
        className='pointer-events-none absolute left-1/2 top-1 z-20 w-28 -translate-x-1/2 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.14)] md:w-32'
      />

      <div className='relative z-10 mx-auto max-w-7xl px-4'>
        <div className='mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end'>
          <div className='w-fit rounded-lg bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm'>
            <h2 id='campaigns-title' className='font-display text-xl font-semibold text-brand-ink md:text-2xl'>Vaquinhas</h2>
            <p className='mt-1 text-sm text-muted-foreground'>Campanhas com um objetivo e um tempo para acontecer.</p>
          </div>
          <button type='button' onClick={onCreate} className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand-blue shadow-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70'>
            <Plus size={17} />Criar vaquinha
          </button>
        </div>

        {loading ? (
          <div className='grid min-h-[220px] place-items-center rounded-[20px] bg-white/95' role='status'>
            <Loader2 className='animate-spin text-brand-blue' />
            <span className='sr-only'>Carregando vaquinhas</span>
          </div>
        ) : loadFailed ? (
          <div className='flex min-h-[220px] max-w-[440px] flex-col items-center justify-center rounded-[20px] bg-white/95 p-6 text-center shadow-sm' role='alert'>
            <p className='font-semibold text-brand-ink'>Não foi possível carregar as vaquinhas.</p>
            <p className='mt-1 text-sm text-muted-foreground'>Verifique sua conexão e tente novamente.</p>
            <button type='button' onClick={loadCampaigns} className='mt-4 min-h-11 rounded-xl bg-brand-blue px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70'>Tentar novamente</button>
          </div>
        ) : (
          <div className='-mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-3 no-scrollbar'>
            {cards.length > 0
              ? cards.map(({ campaign, ngo }) => (
                  <CampaignDisclosureCard
                    key={campaign.id}
                    campaign={campaign}
                    organization={ngo}
                    onOpen={ngo ? () => onOpenOrganization(ngo) : undefined}
                  />
                ))
              : <EmptyCampaignCard onCreate={onCreate} />}
          </div>
        )}
      </div>
    </section>
  );
};

export default CampaignShowcaseSection;