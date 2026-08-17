import { ArrowLeft } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import logo from '@/assets/logo.png';
import YouTubeVideoPopover from '@/components/ui/youtube-video-popover';

const About: React.FC = () => (
  <div className='min-h-screen bg-background text-brand-ink'>
    <header className='border-b border-border/70 bg-background/88 backdrop-blur-xl'>
      <div className='mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5'>
        <Link to='/' className='flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue'>
          <img src={logo} alt='' className='h-10 w-10 rounded-xl shadow-md' />
          <span className='font-display text-xl font-semibold'>Tranquili<span className='text-brand-blue'>Care</span></span>
        </Link>
        <Link to='/' className='inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue'>
          <ArrowLeft size={17} aria-hidden='true' />
          Voltar ao início
        </Link>
      </div>
    </header>

    <main className='mx-auto w-full max-w-6xl px-4 py-12 md:py-20'>
      <section aria-labelledby='about-title'>
        <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Sobre</p>
        <h1 id='about-title' className='mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl'>Conheça o TranquiliCare</h1>
        <p className='font-narrative mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg'>Um jeito mais humano de conhecer causas, apoiar organizações e acompanhar o que acontece depois.</p>
        <div className='mt-9 md:mt-12'>
          <YouTubeVideoPopover videoId='G9V69J7cQtY' title='A história por trás do TranquiliCare' />
        </div>
      </section>
    </main>
  </div>
);

export default About;
