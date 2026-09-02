import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, HandCoins, HandHeart, Heart, Images, TrendingUp } from 'lucide-react';
import { demoNgos } from '@/data/demoNgos';
import {
  DONATION_DISCOVERY_TRIGGER_ID,
  VERIFICATION_DISCOVERY_TRIGGER_ID,
} from '@/lib/discoveryNavigation';
import { loadCommunitySphereProfiles, type CommunitySphereProfile } from '@/lib/communitySphereProfiles';
import { formatBRL, useCountUp } from '@/lib/impact';
import SphereImageGrid, { SphereImage } from './ui/img-sphere';
import SealRolodex from './discovery/SealRolodex';

interface LoggedOutHeroProps {
  communityTotal: number;
  communityDonationCount: number;
  onExplore: () => void;
  onStories: () => void;
  onVerificationDiscovery: () => void;
  onDonationDiscovery: () => void;
}

const preloadVerificationDiscovery = () => {
  void import('@/pages/VerificationDiscovery');
};

const preloadDonationDiscovery = () => {
  void import('@/pages/DonationIntegrityDiscovery');
};

const LoggedOutHero: React.FC<LoggedOutHeroProps> = ({
  communityTotal,
  communityDonationCount,
  onExplore,
  onStories,
  onVerificationDiscovery,
  onDonationDiscovery,
}) => {
  const reduceMotion = useReducedMotion();
  const [metricIndex, setMetricIndex] = useState(0);
  const [openingDiscovery, setOpeningDiscovery] = useState(false);
  const [communityProfiles, setCommunityProfiles] = useState<CommunitySphereProfile[]>([]);
  const discoveryTimer = useRef<number>();
  const animatedTotal = useCountUp(communityTotal);
  const animatedCount = useCountUp(communityDonationCount, 700);
  const averageDonation = useCountUp(
    communityDonationCount > 0 ? Math.round(communityTotal / communityDonationCount) : 0,
    700,
  );

  const sphereImages = useMemo<SphereImage[]>(() => {
    const realProfiles: SphereImage[] = communityProfiles.map((profile) => ({
      id: profile.id,
      src: profile.avatarUrl,
      alt: profile.profileType === 'donor'
        ? `Conhecer ${profile.name}, pessoa da comunidade`
        : `Conhecer ${profile.name}, organização da comunidade`,
      type: 'image',
    }));
    const fallbackProfiles: SphereImage[] = demoNgos.map((ngo) => ({
      id: `fallback-profile-${ngo.id}`,
      src: ngo.image,
      alt: `Conhecer ${ngo.name}`,
      type: 'image',
    }));
    const tranquilicareFallback: SphereImage[] = communityProfiles.some((profile) => (
      profile.profileType === 'organization'
      && profile.name.toLocaleLowerCase('pt-BR').replace(/[^a-z]/g, '').includes('tranquilicare')
    )) ? [] : [{
      id: 'fallback-profile-tranquilicare',
      src: '/images/tranquilicare-heart-transparent.png',
      alt: 'Conhecer TranquiliCare, organização da comunidade',
      type: 'image',
    }];
    const seenSources = new Set<string>();
    return [...realProfiles, ...tranquilicareFallback, ...fallbackProfiles].filter((image) => {
      if (seenSources.has(image.src)) return false;
      seenSources.add(image.src);
      return true;
    }).slice(0, 36);
  }, [communityProfiles]);

  const metrics = useMemo(() => [
    {
      id: 'donated',
      eyebrow: 'Doado pela comunidade',
      value: formatBRL(animatedTotal),
      detail: 'em apoios confirmados na plataforma',
      Icon: HandCoins,
      color: 'text-brand-blue',
    },
    {
      id: 'donations',
      eyebrow: 'Apoios realizados',
      value: new Intl.NumberFormat('pt-BR').format(animatedCount),
      detail: communityDonationCount === 1 ? 'doação confirmada' : 'doações confirmadas',
      Icon: Heart,
      color: 'text-rose-500',
    },
    {
      id: 'average',
      eyebrow: 'Média de cada apoio',
      value: formatBRL(averageDonation),
      detail: 'calculada a partir das doações confirmadas',
      Icon: TrendingUp,
      color: 'text-amber-500',
    },
  ], [animatedCount, animatedTotal, averageDonation, communityDonationCount]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setMetricIndex((current) => (current + 1) % 3),
      4200,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshProfiles = () => {
      void loadCommunitySphereProfiles().then((profiles) => {
        if (active) setCommunityProfiles(profiles);
      });
    };
    refreshProfiles();
    const timer = window.setInterval(refreshProfiles, 60_000);
    window.addEventListener('focus', refreshProfiles);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshProfiles);
    };
  }, []);

  useEffect(() => () => {
    if (discoveryTimer.current) window.clearTimeout(discoveryTimer.current);
  }, []);

  const openVerificationDiscovery = () => {
    if (openingDiscovery) return;
    preloadVerificationDiscovery();
    if (reduceMotion) {
      onVerificationDiscovery();
      return;
    }

    setOpeningDiscovery(true);
    discoveryTimer.current = window.setTimeout(() => {
      setOpeningDiscovery(false);
      onVerificationDiscovery();
    }, 260);
  };

  const activeMetric = metrics[metricIndex];
  const ActiveMetricIcon = activeMetric.Icon;

  return (
    <section className='relative overflow-hidden border-b border-border/70 bg-background'>
      <div className='mx-auto max-w-6xl px-4 pb-8 pt-10 sm:pt-14 lg:pb-10 lg:pt-16'>
        <div className='grid items-center gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10'>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className='relative z-10'
          >
            <SealRolodex
              id={VERIFICATION_DISCOVERY_TRIGGER_ID}
              opening={openingDiscovery}
              onActivate={openVerificationDiscovery}
              onPreload={preloadVerificationDiscovery}
            />
            <h1 className='mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.05] text-brand-ink sm:text-5xl lg:text-[3.55rem]'>
              Encontre uma causa
              <em className='mt-1 block font-display font-semibold text-brand-blue'>
                que combina com você
              </em>
            </h1>
            <p className='font-narrative mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg'>
              Conheça as histórias por trás de cada causa, participe com confiança e acompanhe o que acontece depois.
            </p>
            <div className='mt-7 flex flex-col gap-3 sm:flex-row'>
              <button
                type='button'
                onClick={() => onExplore()}
                className='tc-button-3d inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white'
              >
                Explorar causas
                <ArrowRight size={18} />
              </button>
              <button
                type='button'
                onClick={onStories}
                className='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 text-sm font-bold text-brand-ink transition-colors hover:border-brand-blue hover:text-brand-blue'
              >
                <Images size={18} />
                Conhecer histórias
              </button>
            </div>
            <button
              id={DONATION_DISCOVERY_TRIGGER_ID}
              type='button'
              onClick={onDonationDiscovery}
              onPointerEnter={preloadDonationDiscovery}
              onFocus={preloadDonationDiscovery}
              className='group mt-6 flex items-center gap-2 rounded-lg text-left text-sm font-semibold text-muted-foreground transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-4'
              aria-label='Descobrir como o valor escolhido chega à organização'
            >
              <HandHeart size={19} className='text-brand-blue' />
              100% da sua doação chega na ONG.
              <ArrowRight size={15} className='text-brand-blue transition-transform group-hover:translate-x-1' aria-hidden='true' />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: reduceMotion ? 0 : [0, -5, 0],
            }}
            transition={{
              opacity: { duration: 0.65, delay: 0.12 },
              scale: { duration: 0.65, delay: 0.12 },
              y: reduceMotion ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' },
            }}
            className='relative mx-auto w-full max-w-[520px]'
          >
            <SphereImageGrid
              images={sphereImages}
              onImageSelect={() => onStories()}
              appearance='transparent'
              showHint={false}
              autoRotate
              autoRotateSpeed={0.055}
              maxSize={520}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className='mt-5 overflow-hidden rounded-lg border border-border bg-background shadow-[0_14px_40px_rgba(23,37,84,0.08)] sm:mt-7'
        >
          <div className='grid min-h-[138px] items-center gap-4 px-5 py-5 sm:grid-cols-[220px_1fr_auto] sm:px-7'>
            <div>
              <p className='font-display text-lg font-semibold text-brand-ink'>Impacto da comunidade agora</p>
              <span className='mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700'>
                <span className='relative flex h-2.5 w-2.5'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50' />
                  <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500' />
                </span>
                Atualizado em tempo real
              </span>
            </div>

            <div className='relative min-h-[76px] overflow-hidden border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0'>
              <AnimatePresence mode='wait' initial={false}>
                <motion.div
                  key={activeMetric.id}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className='flex items-center gap-4'
                >
                  <span className='grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary'>
                    <ActiveMetricIcon size={23} className={activeMetric.color} />
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-xs font-bold uppercase text-muted-foreground'>
                      {activeMetric.eyebrow}
                    </span>
                    <span className='mt-0.5 block font-display text-3xl font-semibold leading-none text-brand-ink sm:text-4xl'>
                      {activeMetric.value}
                    </span>
                    <span className='mt-1.5 block text-xs text-muted-foreground'>{activeMetric.detail}</span>
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className='flex gap-1.5 sm:flex-col' aria-label='Indicador da métrica exibida'>
              {metrics.map((metric, index) => (
                <button
                  key={metric.id}
                  type='button'
                  onClick={() => setMetricIndex(index)}
                  className={`h-2 rounded-full transition-[width,background-color] duration-300 sm:h-2 sm:w-2 ${
                    index === metricIndex ? 'w-8 bg-brand-blue sm:w-2' : 'w-2 bg-border'
                  }`}
                  aria-label={`Mostrar ${metric.eyebrow}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LoggedOutHero;
