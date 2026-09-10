import { BookOpen, Heart, MapPin, Music, Pencil, Sparkles, Sun } from 'lucide-react';
import { useState } from 'react';
import { PROFILE_PROMPTS, normalizeProfileAnswers, type ProfileAnswers } from '@/lib/profilePrompts';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';

const icons = { heart: Heart, sun: Sun, sparkles: Sparkles, book: BookOpen, map: MapPin, music: Music };

export function ProfileCuriosities({ answers, onChange, disabled = false }: {
  answers?: ProfileAnswers; onChange?: (answers: ProfileAnswers) => void; disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const editing = Boolean(onChange);
  const visible = editing ? PROFILE_PROMPTS : PROFILE_PROMPTS.filter(({ id }) => normalizeProfileAnswers(answers)[id]);
  if (!visible.length) return null;
  return <section className='py-6' aria-label='Um pouco mais sobre mim'>
    <h2 className='font-display text-2xl font-semibold text-brand-ink'>Um pouco mais sobre mim</h2>
    {editing && <p className='mt-2 text-sm leading-6 text-muted-foreground'>Escolha as perguntas que combinam com você. Todas são opcionais. As respostas salvas aparecem no seu perfil público.</p>}
    <div className='mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2'>
      {visible.map(({ id, question, placeholder, icon }) => {
        const Icon = icons[icon];
        const expanded = selected.includes(id);
        return <div key={id} className='min-w-0 border-b border-border py-4'>
          {editing ? <>
            <button type='button' disabled={disabled} aria-expanded={expanded} aria-controls={`profile-prompt-panel-${id}`} onClick={() => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} className='flex min-h-12 w-full items-center gap-3 rounded-lg text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue'>
              <Icon size={21} className='shrink-0 text-brand-blue' aria-hidden='true' /><span className='flex-1'>{question}</span><Pencil size={16} aria-hidden='true' />
            </button>
            {expanded && <div id={`profile-prompt-panel-${id}`}><SmoothTextarea id={`profile-prompt-${id}`} disabled={disabled} value={answers?.[id] ?? ''} maxLength={240} rows={3} aria-label={question} placeholder={placeholder} onChange={(event) => onChange?.({ ...answers, [id]: event.target.value })} className='mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue' /><span className='block text-right text-xs text-muted-foreground'>{answers?.[id]?.length ?? 0}/240</span></div>}
          </> : <><p className='flex items-center gap-3 text-sm font-semibold'><Icon size={21} className='shrink-0 text-brand-blue' aria-hidden='true' />{question}</p><p className='ml-8 mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground'>{answers?.[id]}</p></>}
        </div>;
      })}
    </div>
  </section>;
}
