import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import logo from '@/assets/logo.png';
import DiscoveryCloseOrBack from './DiscoveryCloseOrBack';
import DiscoveryProgress, { DiscoveryProgressItem } from './DiscoveryProgress';
import DiscoveryScrollContext from './DiscoveryScrollContext';

interface DiscoveryShellProps {
  items: DiscoveryProgressItem[];
  activeIndex: number;
  onBack: () => void;
  children: React.ReactNode;
  presentation?: 'page' | 'overlay';
  minimalChrome?: boolean;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  ariaLabel?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const DiscoveryShell: React.FC<DiscoveryShellProps> = ({
  items,
  activeIndex,
  onBack,
  children,
  presentation = 'page',
  minimalChrome = false,
  scrollContainerRef: providedScrollContainerRef,
  ariaLabel = 'Como verificamos as ONGs',
}) => {
  const reducedMotion = useReducedMotion();
  const overlay = presentation === 'overlay';
  const internalScrollContainerRef = useRef<HTMLElement>(null);
  const scrollContainerRef = providedScrollContainerRef ?? internalScrollContainerRef;

  const goToScene = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  useEffect(() => {
    if (!overlay) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onBack();
        return;
      }

      if (event.key !== 'Tab' || !scrollContainerRef.current) return;
      const focusable = Array.from(
        scrollContainerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === scrollContainerRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack, overlay, scrollContainerRef]);

  useEffect(() => {
    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!hashId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hashId)?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const content = (
    <>
      <a
        href='#discovery-content'
        className={`${overlay ? 'absolute' : 'fixed'} left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-brand-ink px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0`}
      >
        Ir para o conteúdo
      </a>

      {minimalChrome ? (
        <div className='sticky top-0 z-[70] h-0 pointer-events-none'>
          <div className='flex justify-end p-4 sm:p-6'>
            <div className='pointer-events-auto'>
              <DiscoveryCloseOrBack onBack={onBack} overlay />
            </div>
          </div>
        </div>
      ) : <header className='sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl'>
        <div className='mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-5 lg:px-8'>
          {!overlay && <DiscoveryCloseOrBack onBack={onBack} />}
          <div className={`${overlay ? 'flex' : 'hidden sm:flex'} min-w-0 items-center gap-2.5`}>
            <img src={logo} alt='' className='h-9 w-9 rounded-lg shadow-sm' />
            <div className='hidden min-w-0 sm:block'>
              <p className='truncate font-display text-base font-semibold'>
                Tranquili<span className='text-brand-blue'>Care</span>
              </p>
              <p className='truncate text-[11px] font-semibold text-muted-foreground'>Como verificamos as ONGs</p>
            </div>
          </div>
          <div className='ml-auto hidden lg:block'>
            <DiscoveryProgress items={items} activeIndex={activeIndex} onSelect={goToScene} variant='desktop' />
          </div>
          <div className={`${overlay ? '' : 'ml-auto'} flex min-w-0 flex-1 justify-end lg:hidden`}>
            <DiscoveryProgress items={items} activeIndex={activeIndex} onSelect={goToScene} variant='mobile' />
          </div>
          {overlay && <DiscoveryCloseOrBack onBack={onBack} overlay />}
        </div>
      </header>}

      <main id='discovery-content' tabIndex={-1} className='focus:outline-none'>
        {children}
      </main>
    </>
  );

  if (overlay) {
    return (
      <DiscoveryScrollContext.Provider value={scrollContainerRef}>
        <motion.section
          ref={scrollContainerRef}
          role='dialog'
          aria-modal='true'
          aria-label={ariaLabel}
          className='absolute inset-x-1 bottom-0 top-10 overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-background text-brand-ink shadow-[0_-24px_80px_rgba(5,22,38,0.28)] sm:inset-x-3 sm:top-14'
          initial={reducedMotion ? { opacity: 0 } : { y: '100%' }}
          animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
          transition={{ duration: reducedMotion ? 0.01 : 0.72, ease: [0.22, 1, 0.36, 1] }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {content}
        </motion.section>
      </DiscoveryScrollContext.Provider>
    );
  }

  return (
    <DiscoveryScrollContext.Provider value={undefined}>
      <div className='min-h-screen overflow-x-hidden bg-background text-brand-ink'>
        {content}
      </div>
    </DiscoveryScrollContext.Provider>
  );
};

export default DiscoveryShell;
