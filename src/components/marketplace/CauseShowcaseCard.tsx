import React from 'react';

import LoveHeart from '@/components/ui/love-heart';
import { getNgoCategoryTheme } from '@/data/ngoCategories';
import { NGO } from '@/types';

interface CauseShowcaseCardProps {
  ngo: NGO;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onOpen: (ngo: NGO) => void;
  storyPreview?: boolean;
  className?: string;
}

export const CauseShowcaseCard: React.FC<CauseShowcaseCardProps> = ({
  ngo,
  saved,
  onToggleSave,
  onOpen,
  storyPreview = false,
  className = '',
}) => {
  const sortedStories = [...(ngo.posts ?? [])].sort((a, b) => b.timestamp - a.timestamp);
  const featuredStory = sortedStories[0];
  const backgroundImage = ngo.coverImage || featuredStory?.url || ngo.image;
  const cardSummary = storyPreview && featuredStory?.caption ? featuredStory.caption : ngo.description;
  const categoryTheme = getNgoCategoryTheme(ngo.category);

  return (
    <article
      className={`group relative isolate aspect-[4/5] self-start overflow-hidden rounded-[26px] bg-brand-ink shadow-[0_18px_40px_-26px_rgba(17,54,79,0.62)] transition-transform duration-300 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-brand-blue/50 ${className}`}
    >
      <button
        type='button'
        onClick={() => onOpen(ngo)}
        className='absolute inset-0 z-10 rounded-[26px] focus:outline-none'
        aria-label={`Conhecer a causa ${ngo.name}`}
      />

      <img
        src={backgroundImage}
        alt=''
        loading='lazy'
        className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]'
      />
      <div className='absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,36,60,0.08)_10%,rgba(15,36,60,0.1)_40%,rgba(15,36,60,0.92)_100%)]' />

      <span
        className='pointer-events-auto absolute right-3 top-3 z-20 rounded-full border border-white/45 bg-brand-ink/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_24px_-14px_rgba(15,36,60,0.8)] backdrop-blur-md'
        onClick={(event) => event.stopPropagation()}
      >
        <LoveHeart
          checked={saved}
          onChange={() => onToggleSave(ngo.id)}
          label={saved ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        />
      </span>

      <div className='absolute left-1/2 top-[42%] z-[2] h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:-translate-y-[54%]'>
        <img
          src={ngo.image}
          alt={`Identidade de ${ngo.name}`}
          loading='lazy'
          className='h-full w-full object-contain drop-shadow-[0_12px_16px_rgba(15,36,60,0.38)]'
        />
      </div>

      <div className='absolute inset-x-0 bottom-0 z-[2] p-5 text-white'>
        <span className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${categoryTheme.bg} ${categoryTheme.text} ${categoryTheme.border}`}>
          {ngo.category}
        </span>
        <h3 className='font-display text-xl font-semibold leading-tight'>{ngo.name}</h3>
        <p className='mt-2 line-clamp-2 text-sm font-medium leading-5 text-white/85'>{cardSummary}</p>
        {ngo.posts?.length > 0 && (
          <p className='mt-3 text-xs font-semibold text-white/65'>
            {ngo.posts.length} {ngo.posts.length === 1 ? 'história publicada' : 'histórias publicadas'}
          </p>
        )}
      </div>
    </article>
  );
};

export default CauseShowcaseCard;
