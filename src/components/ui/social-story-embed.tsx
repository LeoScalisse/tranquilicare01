import React, { useEffect, useId, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { resolveStorySocialEmbed, type StorySocialProvider } from '@/lib/storySocialEmbed';
import { cn } from '@/lib/utils';

interface SocialStoryEmbedProps {
  src: string;
  provider?: StorySocialProvider;
  title: string;
  interactive?: boolean;
  compact?: boolean;
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

const SocialStoryEmbed: React.FC<SocialStoryEmbedProps> = ({
  src,
  provider,
  title,
  interactive = true,
  compact = false,
  className,
}) => {
  const resolved = resolveStorySocialEmbed(src);
  const actualProvider = provider ?? resolved?.provider;
  const sourceUrl = resolved?.sourceUrl ?? src;
  const [loaded, setLoaded] = useState(false);
  const id = useId().replace(/:/g, '');
  const compactSurface = compact
    ? 'absolute left-0 top-0 h-[340%] w-[340%] origin-top-left scale-[0.2942] pointer-events-none'
    : '';

  useEffect(() => {
    if (actualProvider === 'threads') loadScript('https://www.threads.net/embed.js', 'threads-embed-script');
    if (actualProvider === 'substack') loadScript('https://substack.com/embedjs/embed.js', 'substack-embed-script');
  }, [actualProvider, sourceUrl]);

  if (!actualProvider) return null;

  if ((actualProvider === 'instagram' || actualProvider === 'tiktok') && resolved?.embedUrl) {
    return (
      <div className={cn('relative h-full w-full overflow-hidden bg-white', compact ? 'min-h-0' : 'min-h-[28rem]', className)}>
        {!loaded && (
          <div className='absolute inset-0 grid place-items-center bg-secondary' role='status'>
            <span className='h-7 w-7 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue' aria-label='Carregando publicação' />
          </div>
        )}
        <iframe
          src={resolved.embedUrl}
          title={title}
          className={cn('border-0 bg-white', compact ? compactSurface : 'relative h-full w-full')}
          loading={compact ? 'eager' : 'lazy'}
          allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
          sandbox='allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms'
          onLoad={() => setLoaded(true)}
          tabIndex={interactive && !compact ? 0 : -1}
        />
      </div>
    );
  }

  if (actualProvider === 'threads') {
    return (
      <div className={cn('relative grid h-full place-items-center overflow-hidden bg-white', compact ? 'min-h-0 p-0' : 'min-h-[20rem] p-4', className)}>
        <div className={cn('grid w-full place-items-center', compact && compactSurface)}>
          <blockquote
            id={`threads-${id}`}
            className='text-post-media w-full max-w-[658px] rounded-2xl border border-black/10 bg-white'
            data-text-post-permalink={sourceUrl}
            data-text-post-version='0'
          >
            <a href={sourceUrl} target='_blank' rel='noreferrer' tabIndex={interactive && !compact ? 0 : -1} className='block min-h-56 p-8 text-center text-brand-ink'>Publicação no Threads</a>
          </blockquote>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative grid h-full place-items-center overflow-hidden bg-[#fffdf8]', compact ? 'min-h-0 p-0' : 'min-h-[20rem] p-5', className)}>
      <div className={cn('substack-post-embed w-full max-w-lg overflow-visible rounded-[24px] border border-brand-ink/10 bg-white p-7 text-center shadow-sm', compact && compactSurface)}>
        <a data-post-link href={sourceUrl} target='_blank' rel='noreferrer' tabIndex={interactive && !compact ? 0 : -1} className='group flex flex-col items-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
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