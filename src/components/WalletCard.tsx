import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, CreditCard, Plus, ShieldCheck, WalletCards, X } from 'lucide-react';

interface WalletCardProps {
  credits: number;
  onAddCredits: (amount: number) => void;
}

const TOP_UP_OPTIONS = [50, 100, 300];

const WalletCard: React.FC<WalletCardProps> = ({ credits, onAddCredits }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(100);

  return (
    <motion.section layout className='relative overflow-hidden rounded-lg border-2 border-border bg-background shadow-[0_12px_34px_rgba(17,52,77,0.08)]'>
      <div className={`flex items-center justify-between gap-3 px-4 py-3.5 ${expanded ? 'border-b-2 border-border' : ''}`}>
        <div className='flex min-w-0 items-center gap-3'>
          <span className='grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue'><WalletCards size={22} /></span>
          <div className='min-w-0'><p className='text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground'>Saldo disponível</p><p className='truncate text-xl font-bold'>{credits.toLocaleString('pt-BR')} créditos</p></div>
        </div>
        <button onClick={() => setExpanded((current) => !current)} className={`tc-motion-control grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-border text-muted-foreground transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:border-brand-blue hover:text-brand-blue ${expanded ? '' : 'bg-brand-blue text-white hover:text-white'}`} aria-label={expanded ? 'Fechar carteira' : 'Abrir carteira'}>
          {expanded ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className='overflow-hidden'>
            <div className='space-y-5 px-4 pb-16 pt-4'>
              <div>
                <div className='flex items-center justify-between gap-2'><h3 className='font-bold'>Forma de pagamento</h3><span className='inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600'><ShieldCheck size={14} />Stripe</span></div>
                <div className='mt-3 flex items-center gap-3 rounded-lg bg-secondary/65 p-3'>
                  <span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-brand-blue'><CreditCard size={18} /></span>
                  <div className='min-w-0 flex-1'><p className='text-sm font-bold'>Checkout seguro</p><p className='text-xs text-muted-foreground'>Nenhum dado de cartão fica salvo no app.</p></div>
                  <Check size={17} className='shrink-0 text-emerald-500' />
                </div>
              </div>

              <div>
                <p className='text-sm font-bold text-muted-foreground'>Adicionar créditos</p>
                <div className='mt-2 grid grid-cols-3 gap-2'>
                  {TOP_UP_OPTIONS.map((amount) => <button key={amount} onClick={() => setSelectedAmount(amount)} className={`tc-motion-control rounded-lg border-2 px-2 py-2 text-sm font-bold transition-[color,background-color,border-color,transform] active:scale-[0.985] ${selectedAmount === amount ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-border hover:border-brand-blue/45'}`}>+{amount}</button>)}
                </div>
              </div>
            </div>
            <button onClick={() => onAddCredits(selectedAmount)} className='tc-button-3d absolute bottom-3 left-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white'><Plus size={17} />Adicionar {selectedAmount}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && <button onClick={() => setExpanded(true)} className='absolute bottom-3 right-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue'>Abrir carteira <ChevronDown size={15} /></button>}
    </motion.section>
  );
};

export default WalletCard;
