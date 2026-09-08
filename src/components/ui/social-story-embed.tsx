import React, { useEffect, useId, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { resolveStorySocialEmbed, type StorySocialProvider } from '@/lib/storySocialEmbed';
import { cn } from '@/lib/utils';

interface SocialStoryEmbedProps {
  src: string;
  provider?: StorySocialProvider;
  title: string;
  interactive?: boolean;
  className?: string;
}

const loadScript = (src: string, id: string) => {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.body.appendChild(script);
};

const SocialStoryEmbed: React.FC<SocialStoryEmbedProps> = ({ src, provider, title, interactive = true, className }) => {
  const resolved = resolveStorySocialEmbed(src);
  const actualProvider = provider ?? resolved?.provider;
  const sourceUrl = resolved?.sourceUrl ?? src;
  const [loaded, setLoaded] = useState(false);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    if (!interactive) return;
    if (actualProvider === 'threads') loadScript('https://www.threads.net/embed.js', 'threads-embed-script');
    if (actualProvider === 'substack') loadScript('https://substack.com/embedjs/embed.js', 'substack-embed-script');
  }, [actualProvider, interactive, sourceUrl]);

  if (!actualProvider) return null;

  if (!interactive) {
    const providerLabel = actualProvider === 'instagram' ? 'Instagram' : actualProvider === 'tiktok' ? 'TikTok' : actualProvider === 'threads' ? 'Threads' : 'Substack';
    const providerStyle = actualProvider === 'threads' || actualProvider === 'tiktok' ? 'bg-black' : actualProvider === 'substack' ? 'bg-[#ff6719]' : 'bg-gradient-to-br from-fuchsia-500 via-red-500 to-amber-400';
    return (
      <div className={cn('grid h-full min-h-[18rem] place-items-center bg-white p-5', className)}>
        <div className='flex w-full max-w-lg flex-col items-center rounded-[24px] border border-brand-ink/10 bg-white p-7 text-center shadow-sm'>
          <span className={'grid h-14 w-14 place-items-center rounded-[18px] text-xl font-black text-white ' + providerStyle}>{actualProvider === 'threads' ? '@' : actualProvider === 'substack' ? 'S' : actualProvider === 'tiktok' ? '♪' : '◎'}</span>
          <span className='mt-5 text-xs font-black uppercase tracking-[0.13em] text-brand-ink'>{providerLabel}</span>
          <span className='mt-2 text-lg font-bold text-brand-ink'>Ver publicação incorporada</span>
          <span className='mt-2 text-xs text-muted-foreground'>Toque para abrir a história completa.</span>
        </div>
      </div>
    );
  }
  if ((actualProvider === 'instagram' || actualProvider === 'tiktok') && resolved?.embedUrl) {
    return (
      <div className={cn('relative h-full min-h-[28rem] w-full bg-white', className)}>
        {!loaded && <div className='absolute inset-0 grid place-items-center bg-secondary text-sm font-semibold text-muted-foreground' role='status'>Carregando publicação…</div>}
        <iframe
          src={resolved.embedUrl}
          title={title}
          className='relative h-full w-full border-0 bg-white'
          loading='lazy'
          allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
          sandbox='allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms'
          onLoad={() => setLoaded(true)}
          tabIndex={interactive ? 0 : -1}
        />
      </div>
    );
  }

  if (actualProvider === 'threads') {
    return (
      <div className={cn('grid h-full min-h-[20rem] place-items-center bg-white p-4', className)}>
        <blockquote
          id={`threads-${id}`}
          className='text-post-media w-full max-w-[658px] rounded-2xl border border-black/10 bg-white'
          data-text-post-permalink={sourceUrl}
          data-text-post-version='0'
        >
          <a href={sourceUrl} target='_blank' rel='noreferrer' className='flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center text-brand-ink'>
            <span className='grid h-12 w-12 place-items-center rounded-full bg-black text-lg font-black text-white'>@</span>
            <span className='font-bold'>Ver publicação no Threads</span>
          </a>
        </blockquote>
      </div>
    );
  }

  return (
    <div className={cn('grid h-full min-h-[20rem] place-items-center bg-[#fffdf8] p-5', className)}>
      <div className='substack-post-embed w-full max-w-lg overflow-visible rounded-[24px] border border-brand-ink/10 bg-white p-7 text-center shadow-sm'>
        <a data-post-link href={sourceUrl} target='_blank' rel='noreferrer' className='group flex flex-col items-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
          <span className='grid h-14 w-14 place-items-center rounded-[18px] bg-[#ff6719] text-2xl font-black text-white'>S</span>
          <span className='mt-5 text-xs font-black uppercase tracking-[0.13em] text-[#ff6719]'>Substack</span>
          <span className='mt-2 text-lg font-bold text-brand-ink'>Carregando publicação…</span>
          <span className='mt-5 inline-flex items-center gap-2 rounded-full bg-brand-ink px-4 py-2 text-sm font-bold text-white'>Ver no Substack <ExternalLink size={15} /></span>
        </a>
      </div>
    </div>
  );
};

export default SocialStoryEmbed;
