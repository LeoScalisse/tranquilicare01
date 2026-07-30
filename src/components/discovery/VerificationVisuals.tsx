import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AtSign,
  Building2,
  Check,
  ClipboardCheck,
  FileCheck2,
  FolderHeart,
  HeartHandshake,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import ReducedMotionFallback from './ReducedMotionFallback';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const enterTransition = (index = 0, reduced = false) => ({
  duration: reduced ? 0.12 : 0.68,
  delay: reduced ? 0 : index * 0.12,
  ease: EASE_OUT,
});

export const TrustVisual: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div aria-hidden='true' className='relative mx-auto grid min-h-[390px] w-full max-w-5xl place-items-center overflow-hidden rounded-lg border border-black/5 bg-background shadow-[0_34px_90px_rgba(21,46,71,0.10)] sm:min-h-[520px]'>
      <div className='absolute left-0 top-0 h-2 w-full bg-brand-blue' />
      <div className='absolute bottom-0 right-0 h-24 w-2 bg-brand-yellow sm:h-40' />
      <motion.div
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.82 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.58 }}
        transition={{ duration: reducedMotion ? 0.12 : 1, ease: EASE_OUT }}
        className='relative grid h-52 w-52 place-items-center rounded-lg bg-brand-blue text-white shadow-[0_28px_70px_rgba(56,182,255,0.28)] sm:h-72 sm:w-72'
      >
        <ShieldCheck className='h-28 w-28 sm:h-40 sm:w-40' strokeWidth={1.25} />
        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.7, delay: 0.55, ease: EASE_OUT }}
          className='absolute -bottom-5 h-10 w-28 origin-left rounded-lg bg-brand-yellow sm:w-36'
        />
      </motion.div>
      <p className='absolute bottom-8 left-8 hidden text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground sm:block'>
        Um processo antes de um símbolo
      </p>
    </div>
  );
};

const identityRows = [
  { label: 'Identificação da organização', Icon: Building2 },
  { label: 'Pessoas responsáveis', Icon: Users },
  { label: 'Canais oficiais', Icon: AtSign },
  { label: 'Informações e documentos', Icon: FileCheck2 },
];

export const IdentityVisual: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div aria-hidden='true' className='mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-black/5 bg-background shadow-[0_34px_90px_rgba(21,46,71,0.10)] lg:grid-cols-[0.8fr_1.2fr]'>
      <div className='flex min-h-64 flex-col justify-between bg-brand-blue p-7 text-white sm:p-10 lg:min-h-[520px] lg:p-12'>
        <Building2 className='h-14 w-14' strokeWidth={1.4} />
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-white/65'>Perfil institucional</p>
          <p className='mt-3 max-w-xs font-display text-4xl font-semibold leading-tight'>Quem responde por esta organização?</p>
        </div>
      </div>

      <div className='flex flex-col justify-center p-5 sm:p-9 lg:p-12'>
        <div className='mb-7 flex items-center gap-4 border-b border-border pb-7'>
          <div className='grid h-14 w-14 place-items-center rounded-lg bg-secondary text-brand-ink'>
            <HeartHandshake size={27} />
          </div>
          <div className='flex-1'>
            <div className='h-3 w-36 rounded-full bg-brand-ink/85' />
            <div className='mt-3 h-2 w-24 rounded-full bg-border' />
          </div>
        </div>

        <div className='space-y-3'>
          {identityRows.map(({ label, Icon }, index) => (
            <motion.div
              key={label}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 22 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={enterTransition(index, Boolean(reducedMotion))}
              className='flex min-h-16 items-center gap-4 rounded-lg border border-border bg-background px-4 sm:px-5'
            >
              <Icon size={20} className='shrink-0 text-brand-blue' />
              <span className='flex-1 text-sm font-bold text-brand-ink sm:text-base'>{label}</span>
              <span className='grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700'>
                <Check size={15} strokeWidth={2.5} />
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const evidenceItems = [
  { label: 'Projeto apresentado', detail: 'Objetivo e público atendido', Icon: FolderHeart, color: 'bg-brand-blue text-white' },
  { label: 'Localização informada', detail: 'Contexto de atuação', Icon: MapPin, color: 'bg-brand-yellow text-white' },
  { label: 'Registros de atuação', detail: 'Evidências compartilhadas', Icon: ImageIcon, color: 'bg-emerald-500 text-white' },
];

export const ActuationVisual: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div aria-hidden='true' className='mx-auto w-full max-w-5xl overflow-hidden rounded-lg bg-brand-ink text-white shadow-[0_36px_100px_rgba(14,38,61,0.24)]'>
      <div className='flex min-h-60 flex-col justify-between border-b border-white/10 p-7 sm:min-h-72 sm:p-10 lg:p-12'>
        <div className='flex items-center justify-between gap-4'>
          <span className='inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-yellow'>
            <HeartHandshake size={18} /> Trabalho em contexto
          </span>
          <span className='hidden text-xs font-semibold text-white/45 sm:block'>Informações ilustrativas</span>
        </div>
        <p className='max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl'>A atuação deixa sinais que podem ser compreendidos.</p>
      </div>

      <div className='grid gap-px bg-background/10 sm:grid-cols-3'>
        {evidenceItems.map(({ label, detail, Icon, color }, index) => (
          <motion.div
            key={label}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={enterTransition(index, Boolean(reducedMotion))}
            className='min-h-48 bg-brand-ink p-6 sm:p-7'
          >
            <span className={`grid h-11 w-11 place-items-center rounded-lg ${color}`}>
              <Icon size={21} />
            </span>
            <p className='mt-8 font-bold'>{label}</p>
            <p className='mt-2 text-sm leading-6 text-white/55'>{detail}</p>
          </motion.div>
        ))}
      </div>
      <div className='flex items-center gap-3 border-t border-white/10 px-7 py-5 text-xs font-semibold text-white/55 sm:px-10'>
        <MessageCircle size={17} className='text-brand-blue' />
        O contexto é considerado sem transformar presença física em requisito obrigatório.
      </div>
    </div>
  );
};

export const TransparencyVisual: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const layers = [
    { label: 'Informações claras', detail: 'O que a organização apresenta', Icon: ClipboardCheck, accent: 'bg-brand-blue text-white' },
    { label: 'Responsáveis visíveis', detail: 'Quem responde pela atuação', Icon: Users, accent: 'bg-brand-yellow text-white' },
    { label: 'Evidências organizadas', detail: 'Como o trabalho ganha contexto', Icon: FolderHeart, accent: 'bg-emerald-500 text-white' },
  ];

  return (
    <div aria-hidden='true' className='mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-3'>
      {layers.map(({ label, detail, Icon, accent }, index) => (
        <motion.div
          key={label}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 46, rotate: index === 0 ? -2 : index === 2 ? 2 : 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={enterTransition(index, Boolean(reducedMotion))}
          className='flex min-h-72 flex-col justify-between rounded-lg border border-white/10 bg-background/[0.06] p-6 backdrop-blur-sm sm:min-h-[390px] sm:p-8'
        >
          <span className={`grid h-12 w-12 place-items-center rounded-lg ${accent}`}>
            <Icon size={23} />
          </span>
          <div>
            <p className='font-display text-3xl font-semibold text-white'>{label}</p>
            <p className='mt-3 text-sm leading-6 text-white/55'>{detail}</p>
          </div>
          <div className='flex items-center gap-2 border-t border-white/10 pt-5 text-xs font-bold uppercase tracking-[0.12em] text-white/45'>
            <Check size={16} className='text-emerald-400' /> Organizado com cuidado
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const finalEvidence = [
  { Icon: Building2, label: 'Identidade', position: 'left-[2%] top-[8%] sm:left-[8%]' },
  { Icon: HeartHandshake, label: 'Atuação', position: 'right-[2%] top-[8%] sm:right-[8%]' },
  { Icon: FileCheck2, label: 'Informações', position: 'bottom-[5%] left-[2%] sm:left-[10%]' },
  { Icon: Users, label: 'Responsáveis', position: 'bottom-[5%] right-[2%] sm:right-[10%]' },
];

export const SealVisual: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const staticSeal = (
    <div className='grid h-52 w-52 place-items-center rounded-lg bg-brand-blue text-white shadow-[0_28px_70px_rgba(56,182,255,0.3)] sm:h-64 sm:w-64'>
      <ShieldCheck className='h-28 w-28 sm:h-36 sm:w-36' strokeWidth={1.35} />
    </div>
  );

  return (
    <div aria-hidden='true' className='mx-auto grid min-h-[430px] w-full max-w-5xl place-items-center rounded-lg border border-black/5 bg-background shadow-[0_34px_90px_rgba(21,46,71,0.10)] sm:min-h-[580px]'>
      <ReducedMotionFallback fallback={staticSeal}>
        <div className='relative h-[430px] w-full sm:h-[540px]'>
          {finalEvidence.map(({ Icon, label, position }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.82 }}
              whileInView={{ opacity: [0, 1, 1, 0], scale: [0.82, 1, 0.92, 0.72] }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ duration: 1.65, delay: index * 0.14, ease: EASE_OUT, times: [0, 0.28, 0.74, 1] }}
              className={`absolute ${position} flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-brand-ink sm:px-4 sm:py-3 sm:text-sm`}
            >
              <Icon size={17} className='text-brand-blue' />
              {label}
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{ duration: 0.9, delay: 1.15, ease: EASE_OUT }}
            className='absolute inset-0 grid place-items-center'
          >
            <div className='relative grid h-52 w-52 place-items-center rounded-lg bg-brand-blue text-white shadow-[0_28px_70px_rgba(56,182,255,0.3)] sm:h-64 sm:w-64'>
              <ShieldCheck className='h-28 w-28 sm:h-36 sm:w-36' strokeWidth={1.35} />
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{ duration: 0.55, delay: 1.75, ease: EASE_OUT }}
                className='absolute -right-4 -top-4 grid h-12 w-12 place-items-center rounded-full bg-brand-yellow text-white shadow-md'
              >
                <Sparkles size={20} />
              </motion.span>
            </div>
          </motion.div>
        </div>
      </ReducedMotionFallback>
    </div>
  );
};
