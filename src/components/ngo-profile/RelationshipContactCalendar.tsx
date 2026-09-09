import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { groupContactsByDate, type RecommendedContact } from '@/lib/afterDonation';
import { cn } from '@/lib/utils';

const contactLabel: Record<RecommendedContact['kind'], string> = {
  thanks: 'Agradecimento',
  story: 'História',
  update: 'Atualização',
  impact: 'Impacto',
  closing: 'Fechamento',
};

export const RelationshipContactCalendar = ({ contacts }: { contacts: RecommendedContact[] }) => {
  const contactsByDate = useMemo(() => groupContactsByDate(contacts), [contacts]);
  const reduceMotion = useReducedMotion();
  const today = new Date();
  const firstContactDate = contacts[0] ? new Date(`${contacts[0].scheduledFor}T12:00:00`) : today;
  const hasCurrentMonthContact = contacts.some((contact) =>
    isSameMonth(new Date(`${contact.scheduledFor}T12:00:00`), today),
  );
  const [month, setMonth] = useState(startOfMonth(hasCurrentMonthContact ? today : firstContactDate));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [direction, setDirection] = useState<-1 | 1>(1);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedContacts = selectedDate ? contactsByDate.get(selectedDate) ?? [] : [];
  const navigateMonth = (nextDirection: -1 | 1) => {
    setDirection(nextDirection);
    setMonth((value) => nextDirection === 1 ? addMonths(value, 1) : subMonths(value, 1));
  };
  const monthVariants = {
    enter: (movement: -1 | 1) => ({
      opacity: 0,
      transform: reduceMotion ? 'translateX(0)' : `translateX(${movement * 7}%)`,
    }),
    center: { opacity: 1, transform: 'translateX(0)' },
    exit: (movement: -1 | 1) => ({
      opacity: 0,
      transform: reduceMotion ? 'translateX(0)' : `translateX(${movement * -7}%)`,
    }),
  };
  const monthTransition = reduceMotion
    ? { duration: 0.2 }
    : { duration: 0.24, ease: [0.77, 0, 0.175, 1] as const };

  return (
    <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]'>
      <div className='rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5'>
        <div className='mb-5 flex items-center justify-between'>
          <Button type='button' variant='ghost' size='icon' aria-label='Mês anterior' onClick={() => navigateMonth(-1)}>
            <ChevronLeft />
          </Button>
          <div className='relative min-w-36 overflow-hidden text-center'>
            <AnimatePresence initial={false} custom={direction} mode='popLayout'>
              <motion.p
                key={month.toISOString()}
                custom={direction}
                variants={monthVariants}
                initial='enter'
                animate='center'
                exit='exit'
                transition={monthTransition}
                className='w-full font-bold capitalize text-slate-900'
              >
                {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
              </motion.p>
            </AnimatePresence>
          </div>
          <Button type='button' variant='ghost' size='icon' aria-label='Próximo mês' onClick={() => navigateMonth(1)}>
            <ChevronRight />
          </Button>
        </div>

        <div className='grid grid-cols-7 gap-1 text-center'>
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
            <span key={day} className='pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400'>{day}</span>
          ))}
        </div>

        <div className='relative overflow-hidden' data-calendar-direction={direction === 1 ? 'forward' : 'backward'}>
          <AnimatePresence initial={false} custom={direction} mode='popLayout'>
            <motion.div
              key={format(month, 'yyyy-MM')}
              custom={direction}
              variants={monthVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={monthTransition}
              className='grid w-full grid-cols-7 gap-1 text-center'
            >
              {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayContacts = contactsByDate.get(dateKey) ?? [];
                const selected = selectedDate === dateKey;
                const ariaCount = dayContacts.length === 1 ? '1 contato' : `${dayContacts.length} contatos`;

                return (
                  <button
                    key={dateKey}
                    type='button'
                    aria-label={`${format(day, "d 'de' MMMM", { locale: ptBR })}, ${ariaCount}`}
                    onClick={() => dayContacts.length && setSelectedDate(dateKey)}
                    disabled={!dayContacts.length}
                    className={cn(
                      'relative aspect-square min-h-9 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                      !isSameMonth(day, month) && 'text-slate-300',
                      isSameDay(day, today) && !selected && 'bg-slate-100 font-bold text-slate-900',
                      dayContacts.length && 'cursor-pointer font-bold text-sky-800 hover:bg-sky-50',
                      selected && 'bg-sky-500 text-white shadow-lg shadow-sky-200',
                    )}
                  >
                    {format(day, 'd')}
                    {dayContacts.length > 0 ? (
                      <span className={cn('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-500', selected && 'bg-white')} />
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className='rounded-[24px] border border-sky-100 bg-sky-50/70 p-4'>
        <p className='text-xs font-black uppercase tracking-[0.14em] text-sky-700'>
          {selectedDate ? format(new Date(`${selectedDate}T12:00:00`), "d 'de' MMMM", { locale: ptBR }) : 'Agenda do dia'}
        </p>
        <p className='mt-1 text-sm text-slate-600'>
          {selectedDate ? 'Contatos recomendados para esta data.' : 'Escolha um dia marcado no calendário.'}
        </p>
        <div className='mt-4 space-y-2'>
          <AnimatePresence mode='popLayout'>
            {selectedContacts.map((contact) => (
              <motion.div
                key={contact.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className='rounded-2xl border border-white bg-white p-3 shadow-sm'
              >
                <p className='text-sm font-bold text-slate-900'>{contact.donorName}</p>
                <p className='mt-1 text-xs text-slate-600'>{contact.title}</p>
                <span className='mt-2 inline-flex rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-700'>{contactLabel[contact.kind]}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
