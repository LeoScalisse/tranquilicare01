import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import DiscoveryCTA from '@/components/discovery/DiscoveryCTA';
import DonationFrictionCards from '@/components/discovery/DonationFrictionCards';
import DonationLongRoadScene from '@/components/discovery/DonationLongRoadScene';
import DiscoveryShell from '@/components/discovery/DiscoveryShell';
import DonationAmountMarquee from '@/components/discovery/DonationAmountMarquee';
import NarrativeHorizontalAct from '@/components/discovery/NarrativeHorizontalAct';
import ScrollFloat from '@/components/discovery/ScrollFloat';
import VelocityTextSection from '@/components/discovery/VelocityTextSection';
import AnimatedEllipsis from '@/components/ui/animated-ellipsis';
import BlurText from '@/components/ui/blur-text';
import DonationAmountWheel from '@/components/ui/donation-amount-wheel';
import { clearDiscoveryOrigin, readDiscoveryOrigin } from '@/lib/discoveryNavigation';

interface DiscoveryLocationState {
  hasDiscoveryOrigin?: boolean;
}

interface DonationIntegrityDiscoveryProps {
  presentation?: 'page' | 'overlay';
}

const FinalMark: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  <span className={dark ? 'text-brand-yellow' : 'text-brand-blue'}>{'\u2060'}.</span>
);

const journeyPanels = [
  {
    id: 'friction',
    tone: 'white' as const,
    lines: <DonationFrictionCards />,
  },
  {
    id: 'less-than-expected',
    tone: 'ink' as const,
    lines: <>No fim, a história que você decidiu apoiar pode receber menos do que você imaginava<FinalMark dark /></>,
  },
  {
    id: 'your-choice',
    tone: 'yellow' as const,
    lines: <>Você escolheu quanto queria fazer parte<span className='text-white'>{'\u2060'}.</span></>,
  },
  {
    id: 'perhaps-choice',
    tone: 'mist' as const,
    lines: (
      <>
        Mas talvez<AnimatedEllipsis className='text-brand-blue' />
        <strong className='mt-8 block font-display font-semibold text-brand-blue'>
          Você também devesse poder escolher quanto realmente chega<FinalMark />
        </strong>
      </>
    ),
  },
  {
    id: 'because-perhaps',
    tone: 'sky' as const,
    lines: <>Porque talvez<AnimatedEllipsis className='text-brand-blue' /></>,
  },
  {
    id: 'whole-intention',
    tone: 'ink' as const,
    lines: <strong className='font-display font-semibold text-brand-yellow'>A sua intenção nunca deveria perder força pelo caminho.</strong>,
  },
];

const resolutionBlocks = [
  {
    id: 'same-value',
    content: <>Quando você escolhe um valor para uma causa no TranquiliCare, acreditamos que esse mesmo valor deve chegar integralmente à organização<FinalMark /></>,
  },
  {
    id: 'number',
    content: <>Não porque 100% é um número bonito e gostoso de falar<FinalMark /></>,
  },
  {
    id: 'whole',
    content: <>Mas porque a sua intenção merece chegar inteira<FinalMark /></>,
  },
  {
    id: 'meaning',
    content: <>Porque acreditamos que doar não é apenas transferir dinheiro<FinalMark /></>,
  },
  {
    id: 'impact',
    emphasized: true,
    content: <>É transformar intenção em impacto<FinalMark /></>,
  },
];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const storyCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const DonationIntegrityDiscovery: React.FC<DonationIntegrityDiscoveryProps> = ({
  presentation = 'page',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const overlay = presentation === 'overlay';
  const reducedMotion = useReducedMotion();
  const [storyDonationAmount, setStoryDonationAmount] = React.useState(20);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const routeState = location.state as DiscoveryLocationState | null;
  const hasInternalOrigin = useMemo(
    () => Boolean(routeState?.hasDiscoveryOrigin && readDiscoveryOrigin()),
    [routeState?.hasDiscoveryOrigin],
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Como a doação chega inteira | TranquiliCare';
    if (!overlay && !window.location.hash) window.scrollTo({ top: 0, behavior: 'auto' });
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById('donation-integrity-title')?.focus({ preventScroll: true });
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

  const exploreCauses = useCallback(() => {
    clearDiscoveryOrigin();
    navigate('/?view=marketplace');
  }, [navigate]);

  const setupItems = useMemo(
    () => [
      { id: 'cause', text: 'Você encontra uma causa.' },
      { id: 'meaning', text: 'Ela faz sentido para você.' },
      { id: 'decision', text: 'Você decide ajudar.' },
      { id: 'amount-picker', picker: true },
      { id: 'any-value', text: 'Não importa o valor.' },
      { id: 'natural', text: 'Naquele momento, uma coisa parece natural.' },
      {
        id: 'chosen',
        text: `Já que você escolheu ${storyCurrency.format(storyDonationAmount)}.`,
      },
      {
        id: 'arrival',
        text: `É porque quer que ${storyCurrency.format(storyDonationAmount)} cheguem àquela causa.`,
      },
    ],
    [storyDonationAmount],
  );

  return (
    <DiscoveryShell
      items={[]}
      activeIndex={0}
      onBack={returnToOrigin}
      presentation={presentation}
      minimalChrome
      scrollContainerRef={scrollContainerRef}
      ariaLabel='Como o valor escolhido chega à organização'
    >
      <section className='flex min-h-[105svh] flex-col justify-center overflow-hidden bg-brand-blue pb-20 pt-24 sm:pb-28 sm:pt-28'>
        <h1 id='donation-integrity-title' tabIndex={-1} className='sr-only'>Como o valor escolhido chega à organização</h1>
        <div className='mx-auto mb-10 max-w-7xl px-5 text-center sm:mb-14 sm:px-8'>
          <p className='text-sm font-bold uppercase text-brand-yellow sm:text-base'>Antes de uma doação</p>
          <p className='mx-auto mt-4 max-w-[20rem] py-2 font-display text-4xl font-semibold leading-[1.1] text-white sm:max-w-5xl sm:text-7xl sm:leading-[1.04] lg:text-8xl'>
            Você escolhe quanto vai ser a sua ajuda<FinalMark dark />
          </p>
        </div>
        <DonationAmountMarquee />
      </section>

      <section id='donation-question' className='flex min-h-[82svh] items-center justify-center bg-brand-ink px-5 py-24 text-white sm:px-8'>
        <BlurText
          text='Mas quanto realmente chega?'
          animateBy='words'
          direction='bottom'
          delay={65}
          stepDuration={0.5}
          threshold={0.35}
          rootMargin='0px 0px -10% 0px'
          rootRef={scrollContainerRef}
          punctuationClassName='text-brand-yellow'
          className='justify-center py-2 text-center font-display text-5xl font-semibold leading-[1.08] sm:text-7xl sm:leading-[1.04] lg:text-8xl'
        />
      </section>

      <section aria-labelledby='donation-choice-title' className='bg-background px-5 py-24 sm:px-8 sm:py-32 lg:px-12'>
        <div className='mx-auto max-w-6xl'>
          <p className='text-xs font-bold uppercase text-brand-blue'>Parte I</p>
          <h2 id='donation-choice-title' className='sr-only'>A escolha</h2>
          <div className='mt-14 space-y-[32svh] pb-[26svh] sm:mt-20 sm:space-y-[38svh]'>
            {setupItems.map((item, index) => (
              item.picker ? (
                <div id='story-donation-choice' key={item.id} className='mx-auto flex min-h-[72svh] max-w-5xl flex-col items-center justify-center'>
                  <h3 className='mb-10 text-center font-display text-5xl font-semibold leading-[1.08] text-brand-ink sm:text-7xl lg:text-8xl'>
                    Escolha um valor<span className='text-brand-blue'>.</span>
                  </h3>
                  <DonationAmountWheel
                    id='story-donation-amount'
                    value={storyDonationAmount}
                    onValueChange={setStoryDonationAmount}
                    min={5}
                    max={100_000}
                    step={5}
                    label='Valor escolhido para a história'
                  />
                </div>
              ) : (
                <ScrollFloat
                  key={item.id}
                  scrollContainerRef={scrollContainerRef}
                  animationDuration={1}
                  ease='back.inOut(1.45)'
                  scrollStart='center bottom+=35%'
                  scrollEnd='bottom center'
                  stagger={0.022}
                  punctuationClassName='text-brand-blue'
                  containerClassName={`max-w-5xl font-display text-5xl font-semibold leading-[1.08] text-brand-ink sm:text-7xl sm:leading-[1.05] lg:text-8xl ${index % 2 ? 'ml-auto text-right' : ''}`}
                  textClassName='leading-[1.08] sm:leading-[1.05]'
                >
                  {item.text}
                </ScrollFloat>
              )
            ))}
          </div>
        </div>
      </section>

      <section className='flex min-h-svh items-center bg-brand-yellow px-5 py-28 sm:px-8 sm:py-40 lg:px-12'>
        <h2 className='mx-auto max-w-6xl text-center font-display text-5xl font-semibold leading-[1.08] text-white sm:text-7xl lg:text-8xl'>
          <span>Fazer o bem deveria ser </span>
          <span>tão simples assim</span>
          <span className='text-white'>{'\u2060'}.</span>
        </h2>
      </section>

      <DonationLongRoadScene />

      <NarrativeHorizontalAct
        panels={journeyPanels}
        partLabel=''
        accessibleTitle='O caminho'
        visualPreset='none'
      />

      <VelocityTextSection
        id='donation-intention-repeat'
        eyebrow='Nós repetimos'
        text='A sua intenção nunca deveria perder força pelo caminho.'
        tone='brand-blue'
      />

      <section aria-labelledby='intention-title' className='bg-background px-5 py-28 sm:px-8 sm:py-40 lg:px-12'>
        <div className='mx-auto max-w-5xl'>
          <p className='text-xs font-bold uppercase text-brand-blue'>Parte III</p>
          <motion.h2
            id='intention-title'
            className='mt-5 max-w-4xl font-display text-5xl font-semibold leading-[1.04] text-brand-ink sm:text-7xl lg:text-8xl'
            variants={reveal}
            initial={reducedMotion ? 'visible' : 'hidden'}
            whileInView='visible'
            viewport={{ once: true, amount: 0.35, root: scrollContainerRef }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Foi por isso que pensamos a experiência de doação de outra forma<FinalMark />
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
                {block.content}
              </motion.p>
            ))}
          </div>
        </div>
      </section>

      <section className='flex min-h-svh items-center bg-brand-blue px-5 py-28 sm:px-8 sm:py-40 lg:px-12'>
        <p className='mx-auto max-w-6xl py-2 text-center font-display text-5xl font-semibold leading-[1.08] text-white sm:text-7xl sm:leading-[1.04] lg:text-8xl'>
          Da sua intenção até a causa, nada deveria se perder pelo caminho<FinalMark dark />
        </p>
      </section>

      <section className='flex min-h-[95svh] items-center bg-background px-5 py-24 sm:px-8 sm:py-32 lg:px-12'>
        <div className='mx-auto w-full max-w-5xl text-center'>
          <p className='text-xs font-bold uppercase text-brand-blue'>A intenção chega inteira</p>
          <p className='mt-8 font-display text-8xl font-semibold leading-none text-brand-blue sm:text-9xl lg:text-[14rem]'>100%</p>
          <h2 className='mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight text-brand-ink sm:text-6xl'>
            do valor escolhido é destinado à organização<FinalMark />
          </h2>
          <p className='font-narrative mx-auto mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-2xl'>
            A taxa TranquiliCare é apresentada e adicionada separadamente ao total do apoio.
          </p>
          <div className='mt-12 flex justify-center'>
            <DiscoveryCTA onExplore={exploreCauses} label='Conhecer causas para apoiar' />
          </div>
        </div>
      </section>
    </DiscoveryShell>
  );
};

export default DonationIntegrityDiscovery;
