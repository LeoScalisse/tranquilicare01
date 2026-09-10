import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, HandCoins, HandHeart, Heart, Images } from 'lucide-react';
import {
  DONATION_DISCOVERY_TRIGGER_ID,
  VERIFICATION_DISCOVERY_TRIGGER_ID,
} from '@/lib/discoveryNavigation';
import { loadCommunitySphereProfiles, type CommunitySphereProfile } from '@/lib/communitySphereProfiles';
import { formatBRL, useCountUp } from '@/lib/impact';
import SphereImageGrid, { SphereImage } from './ui/img-sphere';
import SealRolodex from './discovery/SealRolodex';
import CommunitySculpture from './discovery/CommunitySculpture';
import './discovery/community-motion.css';
import { useSectionReveal } from '@/hooks/use-section-reveal';

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
  const heroRef = useSectionReveal();
  const [metricIndex, setMetricIndex] = useState(0);
  const [openingDiscovery, setOpeningDiscovery] = useState(false);
  const [communityProfiles, setCommunityProfiles] = useState<CommunitySphereProfile[]>([]);
  const discoveryTimer = useRef<number>();
  const animatedTotal = useCountUp(communityTotal);
  const animatedCount = useCountUp(communityDonationCount, 700);

  const sphereImages = useMemo<SphereImage[]>(() => {
    const realProfiles: SphereImage[] = communityProfiles.map((profile) => ({
      id: profile.id,
      src: profile.avatarUrl,
      alt: profile.profileType === 'donor'
        ? `Conhecer ${profile.name}, pessoa da comunidade`
        : `Conhecer ${profile.name}, organização da comunidade`,
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
    return [...realProfiles, ...tranquilicareFallback].filter((image) => {
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
      color: 'text-brand-blue',
    },
  ], [animatedCount, animatedTotal, communityDonationCount]);

  useEffect(() => {
    let active = true;
    const refreshProfiles = () => {
      void loadCommunitySphereProfiles().then((profiles) => {
        if (active) setCommunityProfiles(profiles);
      }).catch(() => {
        // Preserve the last loaded profiles if a background refresh fails.
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
    <section ref={heroRef} className='community-hero relative overflow-hidden border-b border-border/70 bg-background'>
      <div className='mx-auto max-w-6xl px-5 pb-8 pt-10 sm:px-6 sm:pt-14 lg:pb-12 lg:pt-20'>
        <div className='grid items-center gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10'>
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className='relative z-10'
          >
            <SealRolodex
              id={VERIFICATION_DISCOVERY_TRIGGER_ID}
              opening={openingDiscovery}
              onActivate={openVerificationDiscovery}
              onPreload={preloadVerificationDiscovery}
            />
            <h1 data-reveal className='mt-6 max-w-2xl text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight text-brand-ink sm:text-5xl lg:text-[3.55rem]'>
              Fazer diferença está
              <span className='mt-1 block'>
                mais perto do que parece.
              </span>
            </h1>
            <p data-reveal className='font-narrative mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg'>
              Conheça quem cuida de causas reais. Encontre seu jeito de participar e acompanhe a história que continua.
            </p>
            <div data-reveal className='mt-7 flex flex-col gap-3 sm:flex-row'>
              <button
                type='button'
                onClick={() => onExplore()}
                className='tc-button-3d inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white'
              >
                Descobrir causas
                <ArrowRight size={18} />
              </button>
              <button
                type='button'
                onClick={onStories}
                className='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue'
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
              Entenda o caminho da sua doação
              <ArrowRight size={15} className='text-brand-blue transition-transform group-hover:translate-x-1' aria-hidden='true' />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.28,
            }}
            className='community-visual relative mx-auto w-full max-w-[520px]'
          >
            <CommunitySculpture />
            <SphereImageGrid
              images={sphereImages}
              onImageSelect={() => onStories()}
              appearance='transparent'
              showHint={false}
              autoRotate={false}
              autoRotateSpeed={0.055}
              maxSize={520}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className='community-metrics mt-8 overflow-hidden rounded-2xl border border-border bg-card sm:mt-12'
        >
          <div className='grid min-h-[138px] items-center gap-4 px-5 py-5 sm:grid-cols-[220px_1fr_auto] sm:px-7'>
            <div>
              <p className='font-display text-lg font-semibold text-brand-ink'>Cada apoio faz parte</p>
              <p className='mt-2 text-sm leading-5 text-muted-foreground'>
                {communityDonationCount > 0 ? 'Conheça o que já construímos juntos.' : 'Uma comunidade começando uma nova história.'}
              </p>
            </div>

            <div className='relative min-h-[76px] overflow-hidden border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0'>
              <AnimatePresence mode='wait' initial={false}>
                <motion.div
                  key={activeMetric.id}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className='flex items-center gap-4'
                >
                  <span className='grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary'>
                    <ActiveMetricIcon size={23} className={activeMetric.color} />
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-xs font-bold uppercase text-muted-foreground'>
                      {activeMetric.eyebrow}
                    </span>
                    <span className='mt-0.5 block font-display text-3xl font-semibold leading-none tabular-nums text-brand-ink sm:text-4xl'>
                      {activeMetric.value}
                    </span>
                    <span className='mt-1.5 block text-xs text-muted-foreground'>{activeMetric.detail}</span>
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className='flex sm:flex-col' aria-label='Escolher indicador'>
              {metrics.map((metric, index) => (
                <button
                  key={metric.id}
                  type='button'
                  onClick={() => setMetricIndex(index)}
                  className='flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue'
                  aria-pressed={index === metricIndex}
                  aria-label={`Mostrar ${metric.eyebrow}`}
                ><span aria-hidden='true' className={`h-2 rounded-full transition-colors ${index === metricIndex ? 'w-5 bg-brand-blue' : 'w-2 bg-muted-foreground/35'}`} /></button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LoggedOutHero;
