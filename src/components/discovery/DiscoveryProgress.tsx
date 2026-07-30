import React from 'react';

export interface DiscoveryProgressItem {
  id: string;
  label: string;
}

interface DiscoveryProgressProps {
  items: DiscoveryProgressItem[];
  activeIndex: number;
  onSelect: (id: string) => void;
  variant?: 'mobile' | 'desktop' | 'all';
}

const DiscoveryProgress: React.FC<DiscoveryProgressProps> = ({ items, activeIndex, onSelect, variant = 'all' }) => (
  <nav
    aria-label='Progresso da descoberta'
    className={variant === 'mobile' ? 'min-w-0 flex-1' : undefined}
  >
    {variant !== 'desktop' && <div className='flex min-w-0 flex-1 items-center gap-3 lg:hidden'>
      <span className='shrink-0 text-xs font-bold text-muted-foreground'>
        Cena {activeIndex + 1} de {items.length}
      </span>
      <div className='flex flex-1 gap-1.5'>
        {items.map((item, index) => (
          <button
            key={item.id}
            type='button'
            onClick={() => onSelect(item.id)}
            className={`h-2 flex-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
              index <= activeIndex ? 'bg-brand-blue' : 'bg-border'
            }`}
            aria-label={`Ir para a cena ${index + 1}: ${item.label}`}
            aria-current={index === activeIndex ? 'step' : undefined}
          />
        ))}
      </div>
    </div>}

    {variant !== 'mobile' && <div className='hidden items-center gap-1 lg:flex'>
      {items.map((item, index) => (
        <button
          key={item.id}
          type='button'
          onClick={() => onSelect(item.id)}
          className={`min-h-10 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
            index === activeIndex
              ? 'bg-brand-blue/10 text-brand-ink'
              : 'text-muted-foreground hover:bg-secondary hover:text-brand-ink'
          }`}
          aria-label={`Ir para a cena ${index + 1}: ${item.label}`}
          aria-current={index === activeIndex ? 'step' : undefined}
        >
          {item.label}
        </button>
      ))}
    </div>}
  </nav>
);

export default DiscoveryProgress;
