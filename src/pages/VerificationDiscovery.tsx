import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import DiscoveryCTA from '@/components/discovery/DiscoveryCTA';
import DiscoveryShell from '@/components/discovery/DiscoveryShell';
import NarrativeHorizontalAct from '@/components/discovery/NarrativeHorizontalAct';
import ScrollFloat from '@/components/discovery/ScrollFloat';
import SealImpactPopover from '@/components/discovery/SealImpactPopover';
import SealImpactShowcase from '@/components/discovery/SealImpactShowcase';
import StoryPunctuation from '@/components/discovery/StoryPunctuation';
import VerificationSealMarquee from '@/components/discovery/VerificationSealMarquee';
import RotatingHeadline from '@/components/RotatingHeadline';
import AnimatedEllipsis from '@/components/ui/animated-ellipsis';
import BlurText from '@/components/ui/blur-text';
import { SquigglyText } from '@/components/ui/squiggly-text';
import { verificationSeals } from '@/data/verificationSeals';
import { clearDiscoveryOrigin, readDiscoveryOrigin } from '@/lib/discoveryNavigation';

interface DiscoveryLocationState {
  hasDiscoveryOrigin?: boolean;
}

interface VerificationDiscoveryProps {
  presentation?: 'page' | 'overlay';
}

const FinalMark: React.FC<{ dark?: boolean; children?: React.ReactNode }> = ({
  dark = false,
  children = '.',
}) => (
  <span className={dark ? 'text-brand-yellow' : 'text-brand-blue'}>{'\u2060'}{children}</span>
);

const conflictPanels = [
  {
    id: 'more-answers',
    tone: 'sky' as const,
    lines: (
      <>
        <span>Você continua procurando respostas<FinalMark /></span>
        <br />
        <span>Tentando entender quem está por trás da organização<FinalMark /></span>
      </>
    ),
  },
  {
    id: 'existence',
    tone: 'white' as const,
    lines: <>Mas saber que uma organização existe não é sinônimo dela ser <span className='text-brand-blue'>confiável.</span></>,
  },
  {
    id: 'lost-opportunities',
    tone: 'ink' as const,
    lines: <>E aqui que se encontra um grande cemitério de oportunidades de fazer o bem<FinalMark dark /></>,
  },
  {
    id: 'cause',
    tone: 'yellow' as const,
    lines: <>Não porque deixaram de acreditar na causa<FinalMark /></>,
  },
  {
    id: 'acting-with-doubt',
    tone: 'mist' as const,
    lines: <>Mas porque ninguém gosta de agir com <strong className='text-brand-blue'>dúvida.</strong></>,
  },
  {
    id: 'question',
    tone: 'green' as const,
    lines: <strong className='font-display font-semibold'>Você não deveria precisar ter essa pergunta na cabeça<FinalMark /></strong>,
  },
  {
    id: 'perhaps',
    tone: 'sky' as const,
    lines: <>Porque talvez<AnimatedEllipsis className='text-brand-blue' /></>,
  },
  {
    id: 'not-your-job',
    tone: 'ink' as const,
    lines: <strong className='font-display font-semibold text-brand-yellow'>Você esteja fazendo um trabalho que nunca deveria ser seu.</strong>,
  },
];

const setupLines = [
  'Você finalmente encontra uma causa.',
  'Ela faz muito sentido para você.',
  'E você decide conhecer melhor o trabalho daquela organização.',
  'Abre o site, vê as redes sociais e procura outras informações.',
  'Mas, quanto mais procura...',
  'Mais dúvidas aparecem.',
];

const resolutionBlocks = [
  {
    id: 'origin',
    content: <>Foi assim que, diante da falta de apoio para embarcar nessa jornada, nasceu a busca por verdade e transparência que move o Tranquili<span className='text-brand-blue'>Care</span><FinalMark /></>,
  },
  {
    id: 'process',
    content: <>Antes que uma organização faça parte da plataforma, ela passa por um processo pensando em tornar visível o cuidado, a transparência e a responsabilidade que já existem em seu trabalho<FinalMark /></>,
  },
  {
    id: 'choice',
    content: <>Não para decidir por você<FinalMark /></>,
  },
  {
    id: 'impact',
    content: (
      <>
        Mas para que você faça parte de cada etapa dessa história de impacto<FinalMark />
        <span className='mt-4 block font-semibold text-brand-ink'>Todas elas mesmo<FinalMark /></span>
      </>
    ),
  },
  {
    id: 'zero',
    content: <>Sem precisar começar do 0 toda vez que encontrar uma nova causa<FinalMark /></>,
  },
  {
    id: 'trust',
    content: <>Porque confiança não nasce de um selo de verificação<FinalMark /></>,
  },
  {
    id: 'continuity',
    content: <>Ela nasce de tudo o que acontece antes dele existir e do cuidado que continua depois<FinalMark /></>,
  },
  {
    id: 'visible',
    emphasized: true,
    content: <>O selo só torna esse cuidado <span className='block'>visível<FinalMark /></span></>,
  },
];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const VerificationDiscovery: React.FC<VerificationDiscoveryProps> = ({ presentation = 'page' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const overlay = presentation === 'overlay';
  const reducedMotion = useReducedMotion();
  const [selectedSealId, setSelectedSealId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const closingInView = useInView(closingRef, { amount: 0.35, root: scrollContainerRef });
  const routeState = location.state as DiscoveryLocationState | null;
  const selectedSeal = useMemo(
    () => verificationSeals.find((seal) => seal.id === selectedSealId) ?? null,
    [selectedSealId],
  );
  const hasInternalOrigin = useMemo(
    () => Boolean(routeState?.hasDiscoveryOrigin && readDiscoveryOrigin()),
    [routeState?.hasDiscoveryOrigin],
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Como verificamos as ONGs | TranquiliCare';
    if (!overlay && !window.location.hash) window.scrollTo({ top: 0, behavior: 'auto' });
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById('verification-story-title')?.focus({ preventScroll: true });
    });
    if (!routeState?.hasDiscoveryOrigin) clearDiscoveryOrigin();
    return () => {
      document.title = previousTitle;
      window.cancelAnimationFrame(focusFrame);
      if (overlay) {
        const origin = readDiscoveryOrigin();
        if (origin) {
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: origin.scrollY, behavior: 'auto' });
            document.getElementById(origin.focusId)?.focus({ preventScroll: true });
            clearDiscoveryOrigin();
          });
        }
      }
    };
  }, [overlay, routeState?.hasDiscoveryOrigin]);

  const returnToOrigin = useCallback(() => {
    if (hasInternalOrigin && readDiscoveryOrigin()) {
      navigate(-1);
      return;
    }
    clearDiscoveryOrigin();
    navigate('/');
  }, [hasInternalOrigin, navigate]);

  const exploreVerifiedOrganizations = useCallback(() => {
    clearDiscoveryOrigin();
    navigate('/?view=marketplace');
  }, [navigate]);

  return (
    <DiscoveryShell
      items={[]}
      activeIndex={0}
      onBack={returnToOrigin}
      presentation={presentation}
      minimalChrome
      scrollContainerRef={scrollContainerRef}
    >
      <section className='flex min-h-[105svh] flex-col justify-center overflow-hidden bg-brand-blue pb-20 pt-24 sm:pb-28 sm:pt-28'>
        <h1 id='verification-story-title' tabIndex={-1} className='sr-only'>Como verificamos as ONGs</h1>
        <div className='mx-auto mb-10 max-w-7xl px-5 text-center sm:mb-14 sm:px-8'>
          <p className='text-sm font-bold uppercase text-brand-yellow sm:text-base'>Antes de uma doação</p>
          <p className='mx-auto mt-4 max-w-[20rem] py-2 font-display text-4xl font-semibold leading-[1.1] text-white sm:max-w-5xl sm:text-7xl sm:leading-[1.04] lg:text-8xl'>
            Existe uma pergunta que muda tudo<FinalMark dark />
          </p>
        </div>
        <VerificationSealMarquee onSealSelect={setSelectedSealId} />
      </section>

      <section className='flex min-h-[82svh] items-center justify-center bg-brand-ink px-5 py-24 text-white sm:px-8'>
        <BlurText
          text='Posso confiar?'
          animateBy='letters'
          direction='bottom'
          delay={85}
          stepDuration={0.5}
          threshold={0.35}
          rootMargin='0px 0px -10% 0px'
          rootRef={scrollContainerRef}
          punctuationClassName='text-brand-yellow'
          className='max-w-full flex-nowrap justify-center whitespace-nowrap py-3 text-center font-display text-[clamp(2.2rem,12vw,5rem)] font-semibold leading-[1.12] sm:text-8xl sm:leading-[1.04] lg:text-9xl'
        />
      </section>

      <section aria-labelledby='setup-title' className='bg-background px-5 py-24 sm:px-8 sm:py-32 lg:px-12'>
        <div className='mx-auto max-w-6xl'>
          <h2 id='setup-title' className='sr-only'>Uma causa que faz sentido</h2>
          <div className='mt-14 space-y-[32svh] pb-[26svh] sm:mt-20 sm:space-y-[38svh]'>
            {setupLines.map((line, index) => (
              <ScrollFloat
                key={line}
                scrollContainerRef={scrollContainerRef}
                animationDuration={1}
                ease='power3.out'
                scrollStart='center bottom+=35%'
                scrollEnd='bottom center'
                stagger={0.016}
                punctuationClassName='text-brand-blue'
                containerClassName={`max-w-5xl font-display text-[clamp(2.35rem,11.5vw,3.25rem)] font-semibold leading-[1.14] text-brand-ink sm:text-7xl sm:leading-[1.08] lg:text-8xl ${index % 2 ? 'sm:ml-auto sm:text-right' : ''}`}
                textClassName='leading-[1.14] sm:leading-[1.08]'
              >
                {line}
              </ScrollFloat>
            ))}
          </div>
        </div>
      </section>

      <section className='flex min-h-svh items-center bg-brand-yellow px-5 py-28 sm:px-8 sm:py-40 lg:px-12'>
        <h2 className='mx-auto max-w-6xl text-center font-display text-5xl font-semibold leading-[1.08] text-brand-ink sm:text-7xl lg:text-8xl'>
          <span>E fazer o bem </span>
          <SquigglyText
            steps={5}
            stepDuration={155}
            scale={[2, 3]}
            baseFrequency={0.016}
            numOctaves={2}
          >
            não deveria começar assim
            <span className='text-brand-blue'>{'\u2060'}.</span>
          </SquigglyText>
        </h2>
      </section>

      <NarrativeHorizontalAct panels={conflictPanels} />

      <section
        aria-labelledby='resolution-title'
        className='bg-background px-5 py-28 sm:px-8 sm:py-40 lg:px-12'
      >
        <div className='mx-auto max-w-5xl'>
          <motion.h2
            id='resolution-title'
            className='mt-5 max-w-4xl font-display text-5xl font-semibold leading-[1.04] text-brand-ink sm:text-7xl lg:text-8xl'
            variants={reveal}
            initial={reducedMotion ? 'visible' : 'hidden'}
            whileInView='visible'
            viewport={{ once: true, amount: 0.35, root: scrollContainerRef }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Alguém precisava fazer esse trabalho antes<FinalMark />
          </motion.h2>

          <div className='font-narrative ml-auto mt-24 max-w-3xl space-y-20 text-2xl leading-relaxed text-brand-ink/80 sm:mt-32 sm:space-y-28 sm:text-4xl'>
            {resolutionBlocks.map((block, index) => (
              <motion.p
                key={block.id}
                className={`${index % 2 ? 'ml-auto text-right' : 'mr-auto'} ${
                  block.emphasized ? 'font-display font-semibold text-brand-ink' : ''
                } max-w-[94%]`}
                variants={reveal}
                initial={reducedMotion ? 'visible' : 'hidden'}
                whileInView='visible'
                viewport={{ once: true, amount: 0.35, root: scrollContainerRef }}
                transition={{ duration: reducedMotion ? 0 : 0.72, ease: [0.22, 1, 0.36, 1] }}
              >
                <StoryPunctuation className='text-brand-blue'>
                  {block.content}
                </StoryPunctuation>
              </motion.p>
            ))}
          </div>
        </div>
      </section>

      <section className='bg-brand-blue px-5 py-28 sm:px-8 sm:py-40 lg:px-12'>
        <div className='mx-auto max-w-6xl'>
          <p className='max-w-5xl py-2 font-display text-5xl font-semibold leading-[1.08] text-white sm:text-7xl sm:leading-[1.04] lg:text-8xl'>
            Porque acreditamos que você pode dedicar menos tempo tentando descobrir em quem confiar<FinalMark dark />
          </p>
          <p className='ml-auto mt-20 max-w-4xl py-2 text-right font-display text-5xl font-semibold leading-[1.08] text-white sm:text-7xl sm:leading-[1.04] lg:text-8xl'>
            E mais tempo fazendo a diferença<FinalMark dark />
          </p>
          <p className='mx-auto mt-32 max-w-3xl text-center font-narrative text-3xl font-medium leading-snug text-brand-yellow sm:text-5xl'>
            Podemos fazer o mundo um lugar melhor.
          </p>
        </div>
      </section>

      <section aria-labelledby='verified-closing-title' className='flex min-h-[108svh] items-center bg-background px-5 py-24 text-brand-ink sm:px-8 sm:py-32 lg:px-12'>
        <div className='mx-auto w-full max-w-6xl text-center'>
          <p className='text-xs font-bold uppercase text-brand-blue'>O cuidado se torna visível</p>
          <h2 id='verified-closing-title' className='sr-only'>Aqui cada ONG é verificada de perto</h2>
          <div ref={closingRef} aria-hidden='true' className='mx-auto mt-7 min-h-44 max-w-5xl sm:min-h-56'>
            {closingInView && (
              <RotatingHeadline
                variant='verified-only'
                verifiedLoopHoldMs={20_000}
                className='py-2 font-display text-5xl font-semibold leading-[1.08] text-brand-ink sm:text-6xl sm:leading-[1.04] lg:text-8xl'
              />
            )}
          </div>
          <SealImpactShowcase onSelect={setSelectedSealId} />
          <div className='mt-12 flex justify-center'>
            <DiscoveryCTA onExplore={exploreVerifiedOrganizations} />
          </div>
        </div>
      </section>

      <SealImpactPopover seal={selectedSeal} onClose={() => setSelectedSealId(null)} />
    </DiscoveryShell>
  );
};

export default VerificationDiscovery;
