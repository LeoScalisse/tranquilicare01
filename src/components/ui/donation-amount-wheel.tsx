import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import AnimateCount from '@/components/ui/animate-count';
import { cn } from '@/lib/utils';

interface DonationAmountWheelProps {
  id?: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  onValueCommit?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
}

interface DragState {
  pointerId: number;
  startY: number;
  startPosition: number;
  lastY: number;
  lastAt: number;
  velocityY: number;
  moved: boolean;
}

const ROW_HEIGHT = 54;
const VISIBLE_RADIUS = 4;
const DRAG_THRESHOLD = 3;
const SNAP_SMOOTHING_MS = 175;
const MANUAL_COMMIT_DELAY_MS = 1000;

const currencyNumber = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatDonationNumber = (amount: number) => (
  Number.isInteger(amount)
    ? currencyNumber.format(amount)
    : amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildSuggestedValues = (min: number, max: number, step: number) => {
  const introductoryValues = [1, 2, 3, 4, 5];
  const values = introductoryValues.filter((amount) => amount >= min && amount <= max);
  const safeStep = Math.max(step, 0.5);
  let amount = Math.max(10, Math.ceil(Math.max(min, 10) / safeStep) * safeStep);

  while (amount <= max) {
    values.push(Math.round(amount * 100) / 100);
    amount += safeStep;
  }

  return values.length > 0 ? values : [min];
};

const DonationAmountWheel: React.FC<DonationAmountWheelProps> = ({
  id = 'donation-amount',
  value,
  onValueChange,
  onValueCommit,
  min = 0.51,
  max = 100_000,
  step = 5,
  className,
  label = 'Valor da doação',
}) => {
  const suggestedValues = useMemo(
    () => buildSuggestedValues(min, max, step),
    [max, min, step],
  );
  const maxIndex = suggestedValues.length - 1;
  const indexFromValue = useCallback((amount: number | null) => amount === null
    ? -1
    : suggestedValues.reduce((nearestIndex, suggestedAmount, index) => (
      Math.abs(suggestedAmount - amount) < Math.abs(suggestedValues[nearestIndex] - amount)
        ? index
        : nearestIndex
    ), 0), [suggestedValues]);
  const valueFromIndex = useCallback((index: number) => index < 0
    ? null
    : suggestedValues[clamp(index, 0, maxIndex)], [maxIndex, suggestedValues]);

  const initialIndex = indexFromValue(value);
  const [draft, setDraft] = useState(() => value === null ? '' : formatDonationNumber(value));
  const [editing, setEditing] = useState(false);
  const [awaitingManualEntry, setAwaitingManualEntry] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [anchorIndex, setAnchorIndex] = useState(initialIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragRef = useRef<DragState | null>(null);
  const positionRef = useRef(initialIndex);
  const targetRef = useRef(initialIndex);
  const selectedRef = useRef(initialIndex);
  const frameRef = useRef<number | null>(null);
  const frameTimeRef = useRef(0);
  const wheelTimerRef = useRef<number | null>(null);
  const manualCommitTimerRef = useRef<number | null>(null);
  const commitWhenSettledRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const commitValue = useCallback((nextValue: number | null) => {
    onValueCommit?.(nextValue);
  }, [onValueCommit]);

  const layoutItems = useCallback((position: number) => {
    itemRefs.current.forEach((element) => {
      if (!element) return;
      const itemIndex = Number(element.dataset.index);
      const distance = itemIndex - position;
      const absoluteDistance = Math.abs(distance);
      const angle = clamp(distance * 10.5, -56, 56);
      const angleRadians = angle * Math.PI / 180;
      const radius = ROW_HEIGHT / (10.5 * Math.PI / 180);
      const y = radius * Math.sin(angleRadians);
      const z = radius * (Math.cos(angleRadians) - 1);
      const scale = Math.max(0.8, 1 - absoluteDistance * 0.05);
      const opacity = absoluteDistance < 0.46
        ? 0
        : Math.max(0.12, 0.94 - absoluteDistance * 0.16);
      const blur = Math.max(0, absoluteDistance - 0.7) * 0.28;

      element.style.transform = `translate3d(0, calc(-50% + ${y.toFixed(2)}px), ${z.toFixed(2)}px) rotateX(${(-angle).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      element.style.opacity = opacity.toFixed(3);
      element.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    });
  }, []);

  const emitSelection = useCallback((index: number) => {
    const nextIndex = clamp(index, -1, maxIndex);
    if (nextIndex === selectedRef.current) return;

    selectedRef.current = nextIndex;
    setAnchorIndex(nextIndex);
    const nextValue = valueFromIndex(nextIndex);
    onValueChange(nextValue);
    setDraft(nextValue === null ? '' : formatDonationNumber(nextValue));
  }, [maxIndex, onValueChange, valueFromIndex]);

  const syncSelection = useCallback((position: number) => {
    emitSelection(clamp(Math.round(position), -1, maxIndex));
  }, [emitSelection, maxIndex]);

  const runFrame = useCallback((now: number) => {
    const elapsed = Math.min(Math.max(now - frameTimeRef.current, 0), 50);
    frameTimeRef.current = now;
    const target = targetRef.current;
    const current = positionRef.current;
    const smoothing = reducedMotion ? 1 : 1 - Math.exp(-elapsed / SNAP_SMOOTHING_MS);
    let next = current + (target - current) * smoothing;
    const settled = Math.abs(target - next) < 0.001;
    if (settled) next = target;

    positionRef.current = next;
    layoutItems(next);
    syncSelection(next);

    if (settled) {
      frameRef.current = null;
      if (commitWhenSettledRef.current) {
        commitWhenSettledRef.current = false;
        commitValue(valueFromIndex(selectedRef.current));
      }
      return;
    }
    frameRef.current = window.requestAnimationFrame(runFrame);
  }, [commitValue, layoutItems, reducedMotion, syncSelection, valueFromIndex]);

  const startLoop = useCallback(() => {
    if (frameRef.current !== null) return;
    frameTimeRef.current = performance.now();
    frameRef.current = window.requestAnimationFrame(runFrame);
  }, [runFrame]);

  const setImmediatePosition = useCallback((position: number) => {
    const next = clamp(position, -1, maxIndex);
    positionRef.current = next;
    targetRef.current = next;
    layoutItems(next);
    syncSelection(next);
  }, [layoutItems, maxIndex, syncSelection]);

  useLayoutEffect(() => {
    layoutItems(positionRef.current);
  }, [anchorIndex, layoutItems]);

  useEffect(() => {
    if (dragRef.current) return;
    const nextIndex = indexFromValue(value);
    if (nextIndex !== selectedRef.current) {
      selectedRef.current = nextIndex;
      setAnchorIndex(nextIndex);
      positionRef.current = nextIndex;
      targetRef.current = nextIndex;
      window.requestAnimationFrame(() => layoutItems(nextIndex));
    }
    if (!editing) setDraft(value === null ? '' : formatDonationNumber(value));
  }, [editing, indexFromValue, layoutItems, value]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    if (manualCommitTimerRef.current !== null) window.clearTimeout(manualCommitTimerRef.current);
  }, []);

  const clearManualCommitTimer = () => {
    if (manualCommitTimerRef.current === null) return;
    window.clearTimeout(manualCommitTimerRef.current);
    manualCommitTimerRef.current = null;
  };

  const parseDraft = (raw: string) => {
    const sanitized = raw.replace(/[^\d.,]/g, '');
    let normalized = sanitized;
    if (sanitized.includes(',')) {
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      const dotParts = sanitized.split('.');
      normalized = dotParts.length === 2 && dotParts[1].length <= 2
        ? sanitized
        : sanitized.replace(/\./g, '');
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const commitDraft = () => {
    clearManualCommitTimer();

    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setDraft(value === null ? '' : formatDonationNumber(value));
      setEditing(false);
      setAwaitingManualEntry(false);
      return;
    }

    if (!draft.trim()) {
      selectedRef.current = -1;
      setAnchorIndex(-1);
      setImmediatePosition(-1);
      onValueChange(null);
      commitValue(null);
      setEditing(false);
      setAwaitingManualEntry(false);
      return;
    }

    const parsed = parseDraft(draft);
    if (parsed === null) {
      setDraft(value === null ? '' : formatDonationNumber(value));
      setEditing(false);
      setAwaitingManualEntry(false);
      return;
    }

    const nextValue = Math.round(clamp(parsed, min, max) * 100) / 100;
    const nextIndex = indexFromValue(nextValue);
    selectedRef.current = nextIndex;
    setAnchorIndex(nextIndex);
    setImmediatePosition(nextIndex);
    onValueChange(nextValue);
    commitValue(nextValue);
    setDraft(formatDonationNumber(nextValue));
    setEditing(false);
    setAwaitingManualEntry(false);
  };

  const beginManualEdit = () => {
    cancelEditRef.current = false;
    setEditing(true);
    setAwaitingManualEntry(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const toggleManualEdit = () => {
    if (editing) {
      inputRef.current?.blur();
      return;
    }
    beginManualEdit();
  };

  const finishDrag = (pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) return;

    dragRef.current = null;
    setIsDragging(false);
    const projectedDistance = drag.moved ? drag.velocityY * 180 / ROW_HEIGHT : 0;
    const destination = clamp(
      Math.round(positionRef.current - projectedDistance),
      -1,
      maxIndex,
    );
    targetRef.current = destination;
    if (reducedMotion) {
      setImmediatePosition(destination);
      commitValue(valueFromIndex(destination));
    } else {
      commitWhenSettledRef.current = true;
      startLoop();
    }
  };

  const wheelItems = Array.from(
    { length: VISIBLE_RADIUS * 2 + 1 },
    (_, slot) => anchorIndex - VISIBLE_RADIUS + slot,
  ).filter((index) => index >= -1 && index <= maxIndex);

  const selectedValue = valueFromIndex(selectedRef.current);
  const selectedLabel = selectedValue === null
    ? 'nenhum valor escolhido'
    : `${formatDonationNumber(selectedValue)} reais`;

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative mx-auto h-72 w-full max-w-sm touch-none select-none overflow-hidden rounded-lg border border-white/35 bg-brand-blue shadow-[0_24px_70px_rgba(9,83,128,0.28),inset_0_1px_0_rgba(255,255,255,0.28)] [perspective:700px]',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      onPointerDown={(event) => {
        if (event.button !== 0 || dragRef.current) return;
        if (editing) inputRef.current?.blur();
        dragRef.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startPosition: positionRef.current,
          lastY: event.clientY,
          lastAt: performance.now(),
          velocityY: 0,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        if (wheelTimerRef.current !== null) {
          window.clearTimeout(wheelTimerRef.current);
          wheelTimerRef.current = null;
        }
        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        targetRef.current = positionRef.current;
        commitWhenSettledRef.current = false;
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const totalOffset = event.clientY - drag.startY;
        const now = performance.now();
        const elapsed = Math.max(now - drag.lastAt, 1);
        const instantVelocity = (event.clientY - drag.lastY) / elapsed;
        drag.velocityY = drag.velocityY * 0.84 + instantVelocity * 0.16;
        drag.lastY = event.clientY;
        drag.lastAt = now;

        if (!drag.moved && Math.abs(totalOffset) >= DRAG_THRESHOLD) {
          drag.moved = true;
          setIsDragging(true);
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        }
        if (!drag.moved) return;

        event.preventDefault();
        setImmediatePosition(drag.startPosition - totalOffset / ROW_HEIGHT);
      }}
      onPointerUp={(event) => finishDrag(event.pointerId)}
      onPointerCancel={(event) => finishDrag(event.pointerId)}
      onLostPointerCapture={(event) => finishDrag(event.pointerId)}
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < 2) return;
        event.preventDefault();
        if (editing) inputRef.current?.blur();
        const normalizedDelta = clamp(event.deltaY / ROW_HEIGHT, -0.72, 0.72);
        targetRef.current = clamp(targetRef.current + normalizedDelta, -1, maxIndex);
        commitWhenSettledRef.current = false;
        startLoop();
        if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = window.setTimeout(() => {
          wheelTimerRef.current = null;
          targetRef.current = clamp(Math.round(targetRef.current), -1, maxIndex);
          commitWhenSettledRef.current = true;
          startLoop();
        }, 180);
      }}
      aria-label={`${label}: ${selectedLabel}. Arraste para cima ou para baixo para alterar.`}
    >
      <div className='pointer-events-none absolute inset-x-0 top-0 z-30 h-20 bg-gradient-to-b from-brand-blue via-brand-blue/80 to-transparent' />
      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-30 h-20 bg-gradient-to-t from-brand-blue via-brand-blue/80 to-transparent' />

      <div className='absolute inset-0 z-10 [transform-style:preserve-3d]' aria-hidden='true'>
        {wheelItems.map((itemIndex, slot) => {
          const itemValue = valueFromIndex(itemIndex);
          return (
            <div
              key={itemIndex}
              ref={(element) => {
                itemRefs.current[slot] = element;
              }}
              data-index={itemIndex}
              className='absolute left-0 top-1/2 flex w-full items-center justify-center whitespace-nowrap text-xl font-bold text-white will-change-[transform,opacity,filter] sm:text-2xl'
            >
              {itemValue === null ? '--' : `R$ ${formatDonationNumber(itemValue)}`}
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-4 top-1/2 z-20 h-[76px] -translate-y-1/2 overflow-hidden rounded-lg border bg-white/20 backdrop-blur-[18px] backdrop-saturate-[1.7] transition-[transform,background-color,border-color,box-shadow] duration-300',
          isDragging
            ? 'scale-[1.018] border-white/85 bg-white/25 shadow-[0_18px_42px_rgba(3,54,91,0.3),inset_0_1px_1px_rgba(255,255,255,0.96),inset_0_-1px_1px_rgba(4,91,145,0.18)]'
            : 'border-white/65 shadow-[0_14px_34px_rgba(4,64,104,0.22),inset_0_1px_1px_rgba(255,255,255,0.88),inset_0_-1px_1px_rgba(4,91,145,0.2)]',
        )}
        style={{
          WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        aria-hidden='true'
      >
        <span className='absolute inset-x-5 top-0 h-px bg-white/90' />
        <span className='absolute bottom-1 left-[18%] right-[18%] h-px bg-brand-blue/15 blur-[1px]' />
      </div>

      <div className='pointer-events-none absolute inset-x-4 top-1/2 z-40 flex h-[76px] -translate-y-1/2 items-center justify-center px-4 text-white'>
        <div className='flex min-w-0 items-center justify-center pr-11 sm:pr-12'>
          <span className='mr-2 text-lg font-bold' aria-hidden='true'>R$</span>
          {editing ? (
            <input
              ref={inputRef}
              id={id}
              value={draft}
              inputMode='decimal'
              autoComplete='off'
              placeholder='--'
              onPointerDown={(event) => event.stopPropagation()}
              onBlur={commitDraft}
              onChange={(event) => {
                clearManualCommitTimer();
                const nextDraft = event.target.value;
                setDraft(nextDraft);
                if (/\d/.test(nextDraft)) setAwaitingManualEntry(false);
                if (!nextDraft.trim()) {
                  onValueChange(null);
                  return;
                }
                const parsed = parseDraft(nextDraft);
                if (parsed !== null && parsed >= min && parsed <= max) {
                  onValueChange(parsed);
                  manualCommitTimerRef.current = window.setTimeout(() => {
                    inputRef.current?.blur();
                  }, MANUAL_COMMIT_DELAY_MS);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  cancelEditRef.current = true;
                  event.currentTarget.blur();
                }
              }}
              aria-label={`${label} em reais`}
              aria-valuemin={min}
              aria-valuemax={max}
              className='pointer-events-auto min-w-0 max-w-[9rem] cursor-text bg-transparent text-center text-3xl font-bold text-white caret-brand-yellow outline-none placeholder:text-white/55 selection:bg-brand-yellow/35 sm:max-w-[11rem] sm:text-4xl'
            />
          ) : (
            <AnimateCount
              value={value}
              formatter={formatDonationNumber}
              className='min-w-[4.5rem] max-w-[9rem] text-center text-3xl font-bold text-white sm:max-w-[11rem] sm:text-4xl'
            />
          )}
        </div>

        <button
          type='button'
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={toggleManualEdit}
          aria-label={editing ? 'Concluir edição manual' : 'Editar valor manualmente'}
          aria-pressed={editing}
          className='pointer-events-auto absolute right-2.5 grid h-11 w-11 place-items-center rounded-full bg-transparent text-white outline-none transition-[transform,color] duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue active:scale-95 sm:right-3.5'
        >
          <span className='relative block h-8 w-10' aria-hidden='true'>
            <span
              className={cn(
                'tc-pencil-line',
                awaitingManualEntry && 'tc-pencil-line--visible',
              )}
            />
            <Pencil
              className={cn(
                'tc-pencil-icon absolute z-10 h-[21px] w-[21px] text-white',
                awaitingManualEntry && 'tc-pencil-icon--writing',
              )}
              strokeWidth={2.25}
            />
          </span>
        </button>
      </div>
    </div>
  );
};

export default DonationAmountWheel;
