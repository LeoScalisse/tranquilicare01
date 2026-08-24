import React, { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, HeartHandshake, Sparkles, UserPlus, X } from 'lucide-react';
import { formatBRL } from '@/lib/impact';
import logo from '@/assets/logo.png';
import ShareCameraButton from './ShareCameraButton';

interface Props {
  open: boolean;
  amountCents: number;
  ngoName: string;
  isLoggedIn: boolean;
  onCreateAccount: () => void;
  onTransferComplete: () => void;
}

interface Destination {
  x: number;
  y: number;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const DonationThankYouDialog: React.FC<Props> = ({
  open,
  amountCents,
  ngoName,
  isLoggedIn,
  onCreateAccount,
  onTransferComplete,
}) => {
  const [canClose, setCanClose] = useState(false);
  const [departing, setDeparting] = useState(false);
  const [destination, setDestination] = useState<Destination>({ x: 0, y: 0 });
  const contentRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const motionDuration = reducedMotion ? 0.01 : 0.55;

  useEffect(() => {
    if (!open) {
      setCanClose(false);
      setDeparting(false);
      setDestination({ x: 0, y: 0 });
      return;
    }
    const timer = window.setTimeout(() => setCanClose(true), 3000);
    return () => window.clearTimeout(timer);
  }, [open]);

  const startTransfer = () => {
    if (!canClose || departing) return;
    const card = document.querySelector<HTMLElement>('[data-donation-card-target]');
    const rect = card?.getBoundingClientRect();
    setDestination({
      x: rect ? rect.left + rect.width / 2 - window.innerWidth / 2 : 0,
      y: rect ? rect.top + rect.height / 2 - window.innerHeight / 2 : 120,
    });
    setDeparting(true);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) startTransfer();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay asChild>
          <motion.div
            className='fixed inset-0 z-50 bg-[#075d91]/90 backdrop-blur-md'
            initial={{ opacity: 0 }}
            animate={{ opacity: departing ? 0 : 1 }}
            transition={{ duration: reducedMotion ? 0.01 : departing ? 0.72 : 0.32, ease: EASE_OUT }}
          />
        </DialogPrimitive.Overlay>

        <DialogPrimitive.Content
          asChild
          onPointerDownOutside={(event) => {
            event.preventDefault();
            startTransfer();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            startTransfer();
          }}
        >
          <motion.section
            ref={contentRef}
            data-share-root
            className='fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[470px] overflow-x-hidden overflow-y-auto rounded-3xl border border-white/60 bg-card shadow-[0_28px_90px_rgba(2,45,72,0.48)] outline-none'
            style={{ translate: '-50% -50%', transformOrigin: 'center' }}
            initial={{ opacity: 0, scale: 0.92, y: 24, borderRadius: 24 }}
            animate={departing
              ? {
                  opacity: 1,
                  scale: reducedMotion ? 0.01 : 0.058,
                  x: destination.x,
                  y: destination.y,
                  borderRadius: 999,
                }
              : { opacity: 1, scale: 1, x: 0, y: 0, borderRadius: 24 }}
            transition={{ duration: departing ? (reducedMotion ? 0.08 : 0.88) : motionDuration, ease: EASE_OUT }}
            onAnimationComplete={() => {
              if (departing) onTransferComplete();
            }}
          >
            <motion.div
              className='absolute inset-0 z-30 bg-brand-yellow'
              initial={{ opacity: 0 }}
              animate={{ opacity: departing ? 1 : 0 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.28 }}
              aria-hidden='true'
            />

            <motion.div animate={{ opacity: departing ? 0 : 1 }} transition={{ duration: reducedMotion ? 0.01 : 0.2 }}>
              <div className='relative overflow-hidden bg-[#075d91] px-7 pb-7 pt-6 text-white sm:px-9'>
                <div className='absolute inset-0 bg-[linear-gradient(135deg,rgba(56,182,255,0.28),transparent_52%,rgba(255,222,89,0.16))]' aria-hidden='true' />
                <motion.div
                  className='absolute -right-14 -top-20 h-56 w-56 rounded-full border border-brand-blue/35'
                  initial={{ scale: 0.72, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.12, ease: EASE_OUT }}
                  aria-hidden='true'
                />
                <motion.div
                  className='absolute -right-4 -top-9 h-32 w-32 rounded-full border border-brand-yellow/35'
                  initial={{ scale: 0.65, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.2, ease: EASE_OUT }}
                  aria-hidden='true'
                />

                <div className='relative flex items-start justify-between gap-5'>
                  <motion.div
                    className='flex items-center gap-3'
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.08, ease: EASE_OUT }}
                  >
                    <span className='flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-brand-blue shadow-lg shadow-brand-blue/20'>
                      <img src={logo} alt='' className='h-11 w-11 object-cover' />
                    </span>
                    <span>
                      <span className='block text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>TranquiliCare</span>
                      <span className='mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/80'>
                        <Check className='h-4 w-4 text-brand-yellow' strokeWidth={3} />
                        Apoio confirmado
                      </span>
                    </span>
                  </motion.div>

                  <div className='relative h-10 w-10 shrink-0' data-share-exclude='true'>
                    <AnimatePresence mode='wait'>
                      {canClose ? (
                        <motion.button
                          type='button'
                          key='close'
                          onClick={startTransfer}
                          initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={{ duration: reducedMotion ? 0.01 : 0.28, ease: EASE_OUT }}
                          className='absolute inset-0 flex items-center justify-center rounded-full bg-background text-brand-blue shadow-lg transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#075d91]'
                          aria-label='Fechar agradecimento'
                        >
                          <X className='h-5 w-5' strokeWidth={2.5} />
                        </motion.button>
                      ) : (
                        <motion.svg key='timer' viewBox='0 0 40 40' className='absolute inset-0 h-10 w-10 -rotate-90' aria-hidden='true'>
                          <circle cx='20' cy='20' r='17' fill='rgba(255,255,255,0.08)' stroke='rgba(255,255,255,0.16)' strokeWidth='2' />
                          <motion.circle
                            cx='20'
                            cy='20'
                            r='17'
                            fill='none'
                            stroke='#38b6ff'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                            pathLength='1'
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 3, ease: 'linear' }}
                          />
                        </motion.svg>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <motion.div
                  className='relative mt-7'
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.18, ease: EASE_OUT }}
                >
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/60'>Você destinou</p>
                  <p className='mt-1 font-display text-4xl font-semibold text-white sm:text-5xl'>{formatBRL(amountCents)}</p>
                  <p className='mt-2 flex items-center gap-2 text-sm text-white/75'>
                    <HeartHandshake className='h-4 w-4 text-brand-yellow' />
                    para {ngoName}
                  </p>
                </motion.div>
              </div>

              <div className='px-7 pb-8 pt-7 sm:px-9'>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.28, ease: EASE_OUT }}
                >
                  <DialogPrimitive.Title className='font-display text-3xl font-semibold leading-tight text-brand-ink'>
                    Parabéns por transformar intenção em apoio.
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className='mt-3 text-sm leading-6 text-muted-foreground'>
                    Obrigado por escolher estar ao lado desta causa. Sua doação já foi confirmada e seguirá para a organização.
                  </DialogPrimitive.Description>
                </motion.div>

                <motion.div
                  className='mt-6 flex items-center gap-3 border-y border-border py-4 text-xs font-semibold text-brand-ink sm:text-sm'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.4 }}
                >
                  <span className='flex items-center gap-1.5'>
                    <Check className='h-4 w-4 text-brand-blue' />
                    Apoio confirmado
                  </span>
                  <ArrowRight className='h-4 w-4 shrink-0 text-muted-foreground' />
                  <span className='flex items-center gap-1.5'>
                    <Sparkles className='h-4 w-4 text-brand-yellow' />
                    Impacto compartilhado
                  </span>
                </motion.div>

                {!isLoggedIn && (
                  <motion.div
                    className='mt-5 rounded-2xl border border-brand-blue/25 bg-brand-blue/10 p-4'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.44, ease: EASE_OUT }}
                  >
                    <div className='flex items-start gap-3'>
                      <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-[#075d91]'>
                        <UserPlus className='h-5 w-5' />
                      </span>
                      <div>
                        <p className='font-semibold text-brand-ink'>Continue acompanhando esta jornada</p>
                        <p className='mt-1 text-sm leading-6 text-muted-foreground'>
                          Sua doação foi concluída. Sem uma conta, você não poderá medir seu impacto com precisão nem receber atualizações sobre a jornada deste apoio.
                        </p>
                      </div>
                    </div>
                    <button
                      type='button'
                      onClick={onCreateAccount}
                      className='mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#075d91] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#064f7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2'
                    >
                      Criar minha conta
                      <ArrowRight className='h-4 w-4' />
                    </button>
                  </motion.div>
                )}

                <motion.div
                  className='mt-5 flex items-end justify-between gap-4'
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDuration, delay: reducedMotion ? 0 : 0.46, ease: EASE_OUT }}
                >
                  <p className='text-sm leading-6 text-muted-foreground'>
                    Em breve, a própria organização poderá mostrar como esse apoio se transformou em impacto real no mundo.
                  </p>
                  <ShareCameraButton
                    getCaptureTarget={() => contentRef.current}
                    title={`Apoiei ${ngoName} pela TranquiliCare`}
                    text={`Meu apoio de ${formatBRL(amountCents)} para ${ngoName} foi confirmado.`}
                    fileName='meu-apoio-tranquilicare.png'
                    className='shrink-0'
                  />
                </motion.div>
              </div>
            </motion.div>
          </motion.section>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default DonationThankYouDialog;
