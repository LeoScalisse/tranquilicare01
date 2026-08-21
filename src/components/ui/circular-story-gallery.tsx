import type { CSSProperties } from 'react';

import './circular-story-gallery.css';

export interface CircularStoryMedia {
  id: string;
  url: string;
  caption?: string;
  ngoName: string;
}

interface CircularStoryGalleryProps {
  items: CircularStoryMedia[];
}

const MAX_VISIBLE_STORIES = 10;

const CircularStoryGallery = ({ items }: CircularStoryGalleryProps) => {
  const visibleItems = items.slice(0, MAX_VISIBLE_STORIES);

  return (
    <div
      data-circular-story-gallery
      className='circular-story-gallery'
      aria-hidden='true'
    >
      <div className='circular-story-gallery__orbit'>
        {visibleItems.map((item, index) => {
          const angle = (index / visibleItems.length) * Math.PI * 2 - Math.PI / 2;
          const style = {
            '--story-x': `${50 + Math.cos(angle) * 43}%`,
            '--story-y': `${50 + Math.sin(angle) * 43}%`,
            '--story-angle': `${(angle * 180) / Math.PI + 90}deg`,
          } as CSSProperties;

          return (
            <div
              key={item.id}
              data-circular-story-card
              className='circular-story-gallery__card'
              style={style}
            >
              <img
                src={item.url}
                alt=''
                draggable={false}
                className='h-full w-full object-cover'
              />
              <span className='circular-story-gallery__card-shade' />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CircularStoryGallery;
