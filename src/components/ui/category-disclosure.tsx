import { useState, type FC } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { ChevronDown, Shapes } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface CategoryDisclosureItem {
  id: string;
  label: string;
  sealSrc?: string;
}

interface CategoryDisclosureProps {
  id: string;
  items: CategoryDisclosureItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

export const CategoryDisclosure: FC<CategoryDisclosureProps> = ({
  id,
  items,
  value,
  onChange,
  placeholder = 'Selecione uma categoria',
  invalid = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const activeItem = items.find((item) => item.id === value);

  const selectItem = (item: CategoryDisclosureItem) => {
    onChange(item.id);
    setOpen(false);
  };

  return (
    <MotionConfig reducedMotion='user'>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
            id={id}
            type='button'
            aria-haspopup='listbox'
            aria-expanded={open}
            aria-invalid={invalid}
            className={cn(
              'mt-2 flex min-h-12 w-full items-center gap-3 rounded-lg border-2 border-border bg-background px-3.5 py-2 text-left outline-none transition-[border-color,box-shadow,transform] active:scale-[0.985] focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/15',
              invalid && 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-100',
              className,
            )}
          >
            <motion.span
              key={activeItem?.id ?? 'empty'}
              initial={{ opacity: 0, transform: 'scale(0.9)' }}
              animate={{ opacity: 1, transform: 'scale(1)' }}
              className='grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-brand-blue/10 text-brand-blue'
            >
              {activeItem?.sealSrc ? (
                <img src={activeItem.sealSrc} alt='' className='h-full w-full object-contain' />
              ) : (
                <Shapes size={18} />
              )}
            </motion.span>
            <span className={cn('min-w-0 flex-1 truncate font-medium', !activeItem && 'text-muted-foreground')}>
              {activeItem?.label ?? placeholder}
            </span>
            <motion.span
              animate={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
              transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: [0.23, 1, 0.32, 1] }}
              className='text-muted-foreground'
            >
              <ChevronDown size={19} />
            </motion.span>
        </PopoverPrimitive.Trigger>

        {open && (
          <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                asChild
                align='start'
                sideOffset={8}
                collisionPadding={12}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  document.getElementById(id)?.focus();
                }}
              >
                <motion.div
                  role='listbox'
                  aria-labelledby={id}
                  initial={{ opacity: 0, transform: reducedMotion ? 'none' : 'translateY(-8px) scale(0.97)' }}
                  animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
                  transition={reducedMotion
                    ? { duration: 0.01 }
                    : { type: 'spring', duration: 0.5, bounce: 0.18 }}
                  style={{
                    width: 'min(var(--radix-popover-trigger-width), 280px)',
                    transformOrigin: '50% 0%',
                  }}
                  className='z-50 max-h-[min(340px,var(--radix-popover-content-available-height))] min-w-[236px] overflow-y-auto rounded-lg border-2 border-border bg-popover p-1.5 text-popover-foreground shadow-[0_14px_32px_rgba(15,42,67,0.14)] outline-none'
                >
                  {items.map((item, index) => {
                    const selected = item.id === value;
                    return (
                      <motion.button
                        key={item.id}
                        type='button'
                        role='option'
                        aria-selected={selected}
                        initial={{ opacity: 0, transform: reducedMotion ? 'none' : 'translateY(10px) scale(0.98)' }}
                        animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
                        transition={reducedMotion
                          ? { duration: 0.01 }
                          : { type: 'spring', duration: 0.4, bounce: 0.12, delay: index * 0.035 }}
                        whileTap={{ transform: 'scale(0.985)' }}
                        onClick={() => selectItem(item)}
                        className={cn(
                          'flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-brand-blue',
                          selected && 'bg-brand-blue/[0.07]',
                        )}
                      >
                        <span className='min-w-0 flex-1 text-sm font-bold'>{item.label}</span>
                        <motion.span
                          animate={{
                            transform: selected ? 'scale(1.08)' : 'scale(1)',
                          }}
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full transition-shadow',
                            selected && 'ring-2 ring-brand-blue ring-offset-1 ring-offset-popover',
                          )}
                        >
                          {item.sealSrc ? (
                            <img src={item.sealSrc} alt='' className='h-full w-full object-contain' />
                          ) : (
                            <Shapes size={17} className='text-muted-foreground' aria-hidden='true' />
                          )}
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        )}
      </PopoverPrimitive.Root>
    </MotionConfig>
  );
};
