import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, Loader2, MapPinned, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ViewOnMapProps {
  locationName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
}

const spring = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 34,
  mass: 0.84,
};

const ViewOnMap: React.FC<ViewOnMapProps> = ({ locationName, address, latitude, longitude, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const reducedMotion = useReducedMotion();
  const id = useId();
  const transition = reducedMotion ? { duration: 0.01 } : spring;
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapQuery = hasCoordinates ? `${latitude},${longitude}` : address;
  const query = encodeURIComponent(mapQuery);
  const embedUrl = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const publicUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  const close = () => {
    setIsOpen(false);
    setIsLoaded(false);
  };

  return (
    <div className={cn(isOpen ? 'w-full max-w-sm basis-full' : 'w-auto', className)}>
      <AnimatePresence initial={false} mode='popLayout'>
        {!isOpen ? (
          <motion.button
            key='map-button'
            layoutId={`map-${id}`}
            type='button'
            onClick={() => setIsOpen(true)}
            className='tc-button-neumorph flex h-12 w-auto items-center justify-center gap-2 rounded-lg border border-brand-blue/15 px-5 text-sm font-bold text-brand-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'
            transition={transition}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
          >
            <MapPinned size={18} className='text-brand-blue' />
            Ver no mapa
          </motion.button>
        ) : (
          <motion.section
            key='map-panel'
            layoutId={`map-${id}`}
            className='relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary shadow-[0_20px_48px_rgba(17,54,79,0.16)]'
            transition={transition}
            aria-label={`Mapa de ${locationName}`}
          >
            {!isLoaded && (
              <div className='absolute inset-0 z-10 grid place-items-center bg-secondary'>
                <Loader2 className='animate-spin text-brand-blue' size={28} />
              </div>
            )}
            <iframe
              title={`Localização de ${locationName}`}
              src={embedUrl}
              loading='lazy'
              referrerPolicy='no-referrer-when-downgrade'
              onLoad={() => setIsLoaded(true)}
              className={cn('size-full border-0 transition-opacity duration-500', isLoaded ? 'opacity-100' : 'opacity-0')}
              allowFullScreen
            />
            <div className='absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-3'>
              <span className='min-w-0 rounded-lg bg-background/90 px-3 py-2 text-xs font-bold text-brand-ink shadow-sm backdrop-blur-md'>
                <span className='block truncate'>{locationName}</span>
              </span>
              <button type='button' onClick={close} className='grid size-10 shrink-0 place-items-center rounded-lg bg-background text-brand-blue shadow-md' aria-label='Fechar mapa'>
                <X size={18} />
              </button>
            </div>
            <a href={publicUrl} target='_blank' rel='noopener noreferrer' className='absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-2 text-xs font-bold text-white shadow-md'>
              Abrir no Maps <ExternalLink size={14} />
            </a>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewOnMap;
