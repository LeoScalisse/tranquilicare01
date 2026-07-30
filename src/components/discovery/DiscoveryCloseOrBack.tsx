import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface DiscoveryCloseOrBackProps {
  onBack: () => void;
  overlay?: boolean;
}

const DiscoveryCloseOrBack: React.FC<DiscoveryCloseOrBackProps> = ({ onBack, overlay = false }) => (
  <button
    type='button'
    onClick={onBack}
    className={`inline-flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-brand-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
      overlay
        ? 'h-11 w-11 rounded-full bg-secondary hover:bg-brand-blue/15 hover:text-brand-blue'
        : 'rounded-lg px-3 hover:bg-brand-blue/10'
    }`}
    aria-label={overlay ? 'Fechar descoberta' : 'Voltar para a página anterior'}
  >
    {overlay ? <X size={21} aria-hidden='true' /> : <ArrowLeft size={19} aria-hidden='true' />}
    {!overlay && <span className='hidden sm:inline'>Voltar</span>}
  </button>
);

export default DiscoveryCloseOrBack;
