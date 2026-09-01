import React from 'react';
import { BadgeCheck, Sparkles } from 'lucide-react';

import LoveHeart from '@/components/ui/love-heart';
import { getNgoCategoryTheme } from '@/data/ngoCategories';
import type { NGO } from '@/types';

export interface MarketplaceCardProps {
  ngo: NGO;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onOpen: (ngo: NGO) => void;
  storyPreview?: boolean;
  preview?: boolean;
  className?: string;
}

const MarketplaceCard: React.FC<MarketplaceCardProps> = ({
  ngo,
  saved,
  onToggleSave,
  onOpen,
  storyPreview = false,
  preview = false,
  className = '',
}) => {
  const sortedStories = [...(ngo.posts ?? [])].sort((a, b) => b.timestamp - a.timestamp);
  const featuredStory = sortedStories[0];
  const backgroundImage = ngo.coverImage || featuredStory?.url || '';
  const cardSummary = storyPreview && featuredStory?.caption ? featuredStory.caption : ngo.description;
  const categoryTheme = getNgoCategoryTheme(ngo.category);
  const cardLogo = ngo.marketplaceLogo || ngo.image;

  return (
    <article
      data-testid={preview ? 'marketplace-card-preview' : undefined}
      className={`group relative isolate aspect-[4/5] self-start overflow-hidden rounded-[26px] bg-[linear-gradient(145deg,#dff6fb,#89cfe8)] shadow-[0_18px_40px_-26px_rgba(17,54,79,0.62)] transition-transform duration-300 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-brand-blue/50 ${className}`}
    >
      {!preview && (
        <button type='button' onClick={() => onOpen(ngo)} className='absolute inset-0 z-10 rounded-[26px] focus:outline-none' aria-label={`Conhecer a causa ${ngo.name}`} />
      )}

      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt={`Foto da causa ${ngo.name}`}
          loading={preview ? 'eager' : 'lazy'}
          className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]'
          style={{ objectPosition: `${(ngo.coverFocalPoint?.x ?? 0.5) * 100}% ${(ngo.coverFocalPoint?.y ?? 0.5) * 100}%` }}
        />
      ) : (
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.9),transparent_28%),linear-gradient(145deg,#e7f8fb_0%,#8ed7ed_48%,#337eb4_100%)]' aria-hidden='true' />
      )}
      <div className='absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,36,60,0.08)_10%,rgba(15,36,60,0.12)_40%,rgba(15,36,60,0.92)_100%)]' />

      <div className='absolute left-3 top-3 z-[3] flex max-w-[70%] flex-wrap gap-1.5'>
        {ngo.verified && (
          <span className='inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-brand-blue shadow-sm backdrop-blur'>
            <BadgeCheck size={13} /> Verificada
          </span>
        )}
        {ngo.isFounder && (
          <span className='inline-flex items-center gap-1 rounded-full border border-brand-yellow/70 bg-brand-yellow/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-brand-ink shadow-sm backdrop-blur'>
            <Sparkles size={12} /> Fundadora
          </span>
        )}
      </div>

      {!preview && (
        <span className='pointer-events-auto absolute right-3 top-3 z-20 rounded-full border border-white/45 bg-brand-ink/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_24px_-14px_rgba(15,36,60,0.8)] backdrop-blur-md' onClick={(event) => event.stopPropagation()}>
          <LoveHeart checked={saved} onChange={() => onToggleSave(ngo.id)} label={saved ? 'Remover dos favoritos' : 'Salvar nos favoritos'} />
        </span>
      )}

      <div className='absolute left-1/2 top-[42%] z-[2] grid h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 place-items-center transition-transform duration-300 group-hover:-translate-y-[54%]'>
        {cardLogo ? (
          <img src={cardLogo} alt={`Identidade de ${ngo.name}`} loading={preview ? 'eager' : 'lazy'} className='h-full w-full object-contain drop-shadow-[0_12px_16px_rgba(15,36,60,0.38)]' />
        ) : (
          <span aria-label={`Identidade textual de ${ngo.name}`} className='grid h-full w-full place-items-center rounded-2xl border border-white/70 bg-white/90 px-2 text-center font-display text-sm font-bold leading-tight text-brand-ink shadow-xl backdrop-blur'>
            {ngo.name}
          </span>
        )}
      </div>

      <div className='absolute inset-x-0 bottom-0 z-[2] p-5 text-white'>
        <span className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${categoryTheme.bg} ${categoryTheme.text} ${categoryTheme.border}`}>
          {ngo.category || 'Causa'}
        </span>
        <h3 className='font-display text-xl font-semibold leading-tight'>{ngo.name || 'Sua organização'}</h3>
        {cardSummary && <p className='mt-2 line-clamp-2 text-sm font-medium leading-5 text-white/85'>{cardSummary}</p>}
        {ngo.posts?.length > 0 && (
          <p className='mt-3 text-xs font-semibold text-white/65'>
            {ngo.posts.length} {ngo.posts.length === 1 ? 'história publicada' : 'histórias publicadas'}
          </p>
        )}
      </div>
    </article>
  );
};

export default MarketplaceCard;
