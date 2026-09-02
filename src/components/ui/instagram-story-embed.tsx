import { Instagram } from 'lucide-react';

import { resolveVideoEmbed } from '@/lib/mediaEmbed';
import { cn } from '@/lib/utils';

interface InstagramStoryEmbedProps {
  src: string;
  title: string;
  interactive?: boolean;
  className?: string;
}

const InstagramStoryEmbed = ({ src, title, interactive = true, className }: InstagramStoryEmbedProps) => {
  const media = resolveVideoEmbed(src);

  if (!media || media.provider !== 'instagram' || !media.embedUrl) {
    return (
      <div className={cn('grid h-full w-full place-items-center bg-brand-blue text-white', className)}>
        <span className='flex items-center gap-2 text-sm font-bold'><Instagram size={18} />Publicação indisponível</span>
      </div>
    );
  }

  return (
    <iframe
      src={media.embedUrl}
      title={title}
      loading='lazy'
      allow='encrypted-media; picture-in-picture; web-share'
      sandbox='allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
      referrerPolicy='strict-origin-when-cross-origin'
      tabIndex={interactive ? 0 : -1}
      className={cn('h-full w-full border-0 bg-white', !interactive && 'pointer-events-none', className)}
    />
  );
};

export default InstagramStoryEmbed;
