import React from 'react';
import { ArrowRight } from 'lucide-react';

interface DiscoveryCTAProps {
  onExplore: () => void;
  label?: string;
}

const DiscoveryCTA: React.FC<DiscoveryCTAProps> = ({
  onExplore,
  label = 'Conhecer organizações verificadas',
}) => (
  <div className='mt-9 w-full max-w-sm'>
    <button
      type='button'
      onClick={onExplore}
      className='tc-button-3d inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-4'
    >
      {label}
      <ArrowRight size={18} aria-hidden='true' />
    </button>
  </div>
);

export default DiscoveryCTA;
