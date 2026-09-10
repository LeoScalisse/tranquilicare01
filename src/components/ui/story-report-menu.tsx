import React, { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Flag, LoaderCircle, MoreHorizontal, Send } from 'lucide-react';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';
import TimedUndoAction from '@/components/ui/timed-undo-action';

interface StoryReportMenuProps {
  canReport: boolean;
  canDelete?: boolean;
  onDelete?: () => Promise<void>;
  onRequireAuth?: () => void;
  onReport: (reason: string) => Promise<void>;
}

const StoryReportMenu: React.FC<StoryReportMenuProps> = ({ canReport, canDelete = false, onDelete, onRequireAuth, onReport }) => {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) return;
    setFormVisible(false);
    setReason('');
    setError('');
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Conte brevemente o motivo da denúncia.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onReport(reason.trim());
      setOpen(false);
    } catch {
      setError('Não foi possível enviar a denúncia. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type='button' className='grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-ink' aria-label='Mais opções'><MoreHorizontal size={19} /></button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align='end' collisionPadding={12} className='z-[175] w-[min(20rem,calc(100vw-1.5rem))] outline-none'>
          <AnimatePresence mode='wait' initial={false}>
            {!formVisible ? (
              <motion.div key='menu' role='menu' aria-label='Opções da história' initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: reduceMotion ? 0.01 : 0.18 }} className='space-y-1 rounded-[18px] border border-brand-ink/10 bg-background p-1.5 shadow-[0_18px_55px_-24px_rgba(15,36,60,0.55)]'>
                {canDelete && onDelete ? (
                  <div role='menuitem' className='px-1 py-0.5'>
                    <TimedUndoAction
                      initialSeconds={10}
                      deleteLabel='Excluir história'
                      undoLabel='Cancelar exclusão'
                      className='min-h-11 w-full'
                      onConfirm={async () => {
                        await onDelete();
                        setOpen(false);
                      }}
                    />
                  </div>
                ) : null}
                <button type='button' role='menuitem' onClick={() => { if (!canReport) { setOpen(false); onRequireAuth?.(); return; } setFormVisible(true); }} className='flex min-h-11 w-full items-center gap-3 rounded-[13px] px-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200'><Flag size={17} /> Denunciar</button>
              </motion.div>
            ) : (
              <motion.form key='form' onSubmit={submit} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.2 }} className='rounded-[22px] border border-brand-ink/10 bg-background p-4 shadow-[0_20px_60px_-24px_rgba(15,36,60,0.58)]'>
                <label htmlFor='story-report-reason' className='font-display text-base font-semibold text-brand-ink'>Conte o motivo da denúncia</label>
                <SmoothTextarea id='story-report-reason' value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1000} autoFocus placeholder='O que precisa ser analisado?' className='mt-3 w-full resize-none rounded-[14px] border border-brand-ink/15 bg-secondary/45 px-3 py-2.5 text-sm leading-5 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10' />
                {error && <p role='alert' className='mt-2 text-xs font-semibold text-red-600'>{error}</p>}
                <button type='submit' disabled={submitting} className='tc-button-3d text-white rounded-xl mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-65'>{submitting ? <LoaderCircle size={16} className='animate-spin' /> : <Send size={15} />}Enviar denúncia</button>
              </motion.form>
            )}
          </AnimatePresence>
          <Popover.Arrow className='fill-background' />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default StoryReportMenu;
