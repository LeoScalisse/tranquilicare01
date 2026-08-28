import { useRef } from 'react';
import { Building2, Camera, CheckCircle2, CircleDollarSign, Loader2, ShieldCheck } from 'lucide-react';

import { CategoryDisclosure, type CategoryDisclosureItem } from '@/components/ui/category-disclosure';
import { SmoothInput } from '@/components/ui/smooth-input';
import { gsap, useGSAP } from '@/lib/gsap';
import type { NgoProfileDetails } from '@/lib/authTypes';

type SetupStage = 3 | 4;

type Props = {
  stage: SetupStage;
  avatar: string | null;
  details: NgoProfileDetails;
  categories: CategoryDisclosureItem[];
  saving: boolean;
  onDetailsChange: (patch: Partial<NgoProfileDetails>) => void;
  onChooseImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCauseSubmit: () => void;
  onPreparationSubmit: () => void;
  onDoLater: () => void;
};

const fieldClass = 'mt-2 w-full rounded-xl border border-brand-ink/10 bg-background px-4 py-3 text-brand-ink outline-none transition-[border-color,box-shadow] focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10';
const labelClass = 'block text-sm font-bold text-brand-ink';

export const NGOOnboardingFlow = ({
  stage,
  avatar,
  details,
  categories,
  saving,
  onDetailsChange,
  onChooseImage,
  onCauseSubmit,
  onPreparationSubmit,
  onDoLater,
}: Props) => {
  const scope = useRef<HTMLDivElement>(null);

  // Rare, first-time onboarding: GSAP only clarifies the new step; reduced-motion
  // users retain the opacity state without spatial movement.
  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.from('[data-onboarding-entry]', {
      opacity: 0,
      y: reduced ? 0 : 14,
      duration: 0.28,
      stagger: reduced ? 0 : 0.055,
      ease: 'power3.out',
      clearProps: 'transform',
    });
  }, { scope, dependencies: [stage] });

  if (stage === 3) {
    return (
      <main ref={scope} className='mx-auto w-full max-w-xl px-5 pb-20 pt-10 sm:pt-16'>
        <p data-onboarding-entry className='text-sm font-bold text-brand-blue'>3 de 4</p>
        <h1 data-onboarding-entry className='mt-3 font-display text-4xl font-semibold tracking-tight text-brand-ink sm:text-5xl'>Apresente sua causa.</h1>
        <p data-onboarding-entry className='mt-4 max-w-lg text-base leading-7 text-muted-foreground'>É assim que as pessoas vão conhecê-la pela primeira vez.</p>

        <form data-onboarding-entry className='mt-10 space-y-7' onSubmit={(event) => { event.preventDefault(); onCauseSubmit(); }} noValidate>
          <label className={labelClass}>
            Qual é a principal causa de vocês?
            <CategoryDisclosure
              id='setup-cause-category'
              items={categories}
              value={details.category}
              onChange={(category) => onDetailsChange({ category })}
              placeholder='Escolha uma causa'
            />
          </label>

          <label className={labelClass} htmlFor='setup-cause-purpose'>
            Por que essa causa existe?
            <textarea id='setup-cause-purpose' value={details.description} onChange={(event) => onDetailsChange({ description: event.target.value })} placeholder='O que vocês acreditam que precisa mudar?' rows={4} maxLength={700} className={`${fieldClass} resize-y leading-6`} />
          </label>

          <label className={labelClass} htmlFor='setup-cause-action'>
            O que vocês fazem?
            <textarea id='setup-cause-action' value={details.objectives[0] ?? ''} onChange={(event) => onDetailsChange({ objectives: event.target.value.trim() ? [event.target.value] : [] })} placeholder='Conte como vocês atuam e quem essa causa alcança.' rows={4} maxLength={400} className={`${fieldClass} resize-y leading-6`} />
          </label>

          <label className={labelClass} htmlFor='setup-cause-goal'>
            O que vocês querem tornar possível agora?
            <textarea id='setup-cause-goal' value={details.goal} onChange={(event) => onDetailsChange({ goal: event.target.value })} placeholder='Conte qual é a prioridade mais importante da organização neste momento.' rows={4} maxLength={400} className={`${fieldClass} resize-y leading-6`} />
          </label>

          <label className={labelClass} htmlFor='setup-cause-location'>
            Onde vocês atuam?
            <SmoothInput id='setup-cause-location' value={details.address} onChange={(event) => onDetailsChange({ address: event.target.value })} placeholder='Cidade, estado' className={fieldClass} />
          </label>

          <div className='border-t border-brand-ink/10 pt-7'>
            <div className='flex items-center gap-4'>
              <div className='grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-brand-blue/40 bg-brand-blue/5'>
                {avatar ? <img src={avatar} alt='' className='size-full object-cover' /> : <Building2 className='text-brand-blue/55' size={25} />}
              </div>
              <div>
                <label className='inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-ink/15 px-4 py-2.5 text-sm font-bold text-brand-ink transition-colors hover:border-brand-blue hover:text-brand-blue'>
                  <Camera size={17} />Adicionar imagem
                  <input type='file' accept='image/*' className='sr-only' onChange={onChooseImage} />
                </label>
                <p className='mt-2 text-xs text-muted-foreground'>Opcional. Você poderá trocar depois.</p>
              </div>
            </div>
          </div>

          <button type='submit' disabled={saving} className='tc-button-3d flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold text-white disabled:opacity-60'>
            {saving ? <Loader2 size={18} className='animate-spin' /> : null}Continuar
          </button>
        </form>
      </main>
    );
  }

  const payoutCopy = details.payoutStatus === 'configured'
    ? 'Recebimentos configurados'
    : details.payoutStatus === 'in_review'
      ? 'Recebimentos em análise'
      : details.payoutStatus === 'needs_review'
        ? 'Precisamos revisar algumas informações'
        : 'Recebimentos ainda não configurados';

  return (
    <main ref={scope} className='mx-auto w-full max-w-xl px-5 pb-20 pt-10 sm:pt-16'>
      <p data-onboarding-entry className='text-sm font-bold text-brand-blue'>4 de 4</p>
      <h1 data-onboarding-entry className='mt-3 font-display text-4xl font-semibold tracking-tight text-brand-ink sm:text-5xl'>Prepare sua organização para receber apoio.</h1>
      <p data-onboarding-entry className='mt-4 max-w-lg text-base leading-7 text-muted-foreground'>Complete a verificação e configure os recebimentos quando estiver pronto.</p>

      <form data-onboarding-entry className='mt-10 space-y-8' onSubmit={(event) => { event.preventDefault(); onPreparationSubmit(); }} noValidate>
        <section className='space-y-5 border-t border-brand-ink/10 pt-7'>
          <div className='flex gap-3'><Building2 className='mt-0.5 text-brand-blue' size={19} /><div><h2 className='font-display text-xl font-semibold'>Organização</h2><p className='mt-1 text-sm leading-6 text-muted-foreground'>Informações institucionais usadas na verificação.</p></div></div>
          <label className={labelClass} htmlFor='setup-preparation-cnpj'>CNPJ
            <SmoothInput id='setup-preparation-cnpj' inputMode='numeric' value={details.cnpj} onChange={(event) => onDetailsChange({ cnpj: event.target.value })} placeholder='00.000.000/0000-00' className={fieldClass} />
          </label>
          <label className={labelClass} htmlFor='setup-preparation-address'>Endereço oficial
            <SmoothInput id='setup-preparation-address' value={details.address} onChange={(event) => onDetailsChange({ address: event.target.value })} placeholder='Rua, número, cidade e estado' className={fieldClass} />
          </label>
        </section>

        <section className='border-t border-brand-ink/10 pt-7'>
          <div className='flex gap-3'><ShieldCheck className='mt-0.5 text-brand-blue' size={19} /><div><h2 className='font-display text-xl font-semibold'>Responsável</h2><p className='mt-1 text-sm leading-6 text-muted-foreground'>A organização será revisada a partir do acesso autenticado e dos dados institucionais informados.</p></div></div>
        </section>

        <section className='border-t border-brand-ink/10 pt-7'>
          <div className='flex gap-3'><CircleDollarSign className='mt-0.5 text-brand-blue' size={19} /><div><h2 className='font-display text-xl font-semibold'>Recebimentos</h2><p className='mt-1 text-sm leading-6 text-muted-foreground'>Configure onde os valores destinados à sua causa serão recebidos.</p></div></div>
          <div className='mt-4 flex items-center justify-between gap-3 rounded-xl bg-secondary/70 px-4 py-3'>
            <span className='text-sm font-semibold text-brand-ink'>{payoutCopy}</span>
            {details.payoutStatus !== 'configured' && <span className='text-xs font-bold text-brand-blue'>{details.payoutStatus === 'needs_review' ? 'Revisar recebimentos' : 'Configurar recebimentos'}</span>}
          </div>
        </section>

        <button type='submit' disabled={saving} className='tc-button-3d flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold text-white disabled:opacity-60'>
          {saving ? <Loader2 size={18} className='animate-spin' /> : <CheckCircle2 size={18} />}Concluir preparação
        </button>
        <button type='button' onClick={onDoLater} disabled={saving} className='mx-auto block px-4 py-2 text-sm font-bold text-brand-blue disabled:opacity-60'>Fazer depois</button>
      </form>
    </main>
  );
};

export default NGOOnboardingFlow;
