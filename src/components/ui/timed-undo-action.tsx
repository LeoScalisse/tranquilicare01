import { cn } from '@/lib/utils';
import { Loader2, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import useMeasure from 'react-use-measure';

export interface TimedUndoActionProps {
  initialSeconds?: number;
  deleteLabel?: string;
  undoLabel?: string;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onUndo?: () => void;
}

export const TimedUndoAction: FC<TimedUndoActionProps> = ({
  initialSeconds = 10,
  deleteLabel = 'Excluir',
  undoLabel = 'Cancelar exclusão',
  icon,
  className,
  disabled = false,
  onConfirm,
  onUndo,
}) => {
  const [pending, setPending] = useState(false);
  const [countDown, setCountDown] = useState(initialSeconds);
  const [confirming, setConfirming] = useState(false);
  const [ref, bounds] = useMeasure({ offsetSize: true });
  const reduceMotion = useReducedMotion();
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  const toggle = () => {
    if (disabled || confirming) return;
    if (pending) {
      setPending(false);
      setCountDown(initialSeconds);
      onUndo?.();
      return;
    }
    setCountDown(initialSeconds);
    setPending(true);
  };

  useEffect(() => {
    if (!pending) return undefined;
    const timeout = window.setTimeout(() => {
      if (countDown > 1) {
        setCountDown((current) => current - 1);
        return;
      }
      setPending(false);
      setConfirming(true);
      void Promise.resolve().then(() => confirmRef.current()).catch(() => undefined).finally(() => {
        setConfirming(false);
        setCountDown(initialSeconds);
      });
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [countDown, initialSeconds, pending]);

  return (
    <MotionConfig transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 250, damping: 22 }}>
      <motion.button
        type='button'
        disabled={disabled || confirming}
        onClick={toggle}
        className={cn(
          'relative flex min-h-10 cursor-pointer items-center justify-start overflow-hidden rounded-full bg-destructive text-destructive-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-55',
          pending && 'bg-destructive/10 text-destructive',
          className,
        )}
        animate={{ width: bounds.width > 0 ? bounds.width : 'auto' }}
        aria-label={pending ? undoLabel + '. ' + countDown + ' segundos restantes' : deleteLabel}
      >
        <span ref={ref} className={cn('flex min-w-max items-center justify-center gap-2 px-4 py-2', pending && 'px-2')}>
          <AnimatePresence mode='popLayout' initial={false}>
            {pending && (
              <motion.span key='undo' className='grid size-8 place-items-center rounded-full bg-destructive text-white' initial={{ opacity: 0, scale: 0.65 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.65 }}>
                <Undo2 className='size-4' aria-hidden='true' />
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatedText text={confirming ? 'Excluindo…' : pending ? undoLabel : deleteLabel} />
          <AnimatePresence mode='popLayout' initial={false}>
            {confirming ? (
              <motion.span key='loading' className='grid size-7 place-items-center'><Loader2 className='size-4 animate-spin' /></motion.span>
            ) : pending ? (
              <motion.span key={countDown} className='grid min-w-8 place-items-center rounded-full bg-destructive px-2 py-1 text-sm font-bold tabular-nums text-white' initial={{ opacity: 0, y: -8, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.7 }}>{countDown}</motion.span>
            ) : (
              <motion.span key='trash'><span className='sr-only'>Excluir</span>{icon ?? <Trash2 className='size-4' aria-hidden='true' />}</motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </MotionConfig>
  );
};

const AnimatedText = ({ text }: { text: string }) => (
  <AnimatePresence mode='popLayout' initial={false}>
    <motion.span key={text} className='text-sm font-bold' initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}>
      {text}
    </motion.span>
  </AnimatePresence>
);

export default TimedUndoAction;