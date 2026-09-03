import { useRef } from 'react';
import { Building2, CheckCircle2, CircleDollarSign, Loader2, ShieldCheck } from 'lucide-react';

import { CategoryDisclosure, type CategoryDisclosureItem } from '@/components/ui/category-disclosure';
import { SmoothInput } from '@/components/ui/smooth-input';
import { BRAZILIAN_STATES } from '@/lib/organizationProfile';
import { gsap, useGSAP } from '@/lib/gsap';
import type { NgoProfileDetails } from '@/lib/authTypes';
import NGOVisualOnboardingStep, { type NGOVisualSetupInput } from '@/components/ngo-profile/NGOVisualOnboardingStep';
import type { NGO } from '@/types';
import founderSeal from '@/assets/founder-ngo-seal.png';

export type SetupStage = 3 | 'visual' | 4;

type Props = {
  stage: SetupStage;
  organizationName: string;
  avatar: string | null;
  details: NgoProfileDetails;
  founderCode: string;
  founderCodeError?: string;
  categories: CategoryDisclosureItem[];
  saving: boolean;
  onDetailsChange: (patch: Partial<NgoProfileDetails>) => void;
  onFounderCodeChange: (value: string) => void;
  onCauseSubmit: () => void;
  onVisualSubmit: (input: NGOVisualSetupInput) => void | Promise<void>;
  onPreparationSubmit: () => void;
  onDoLater: () => void;
};

const fieldClass = 'mt-2 w-full rounded-xl border border-brand-ink/10 bg-background px-4 py-3 text-brand-ink outline-none transition-[border-color,box-shadow] focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10';
const labelClass = 'block text-sm font-bold text-brand-ink';

export const NGOOnboardingFlow = ({
  stage,
  organizationName,
  avatar,
  details,
  founderCode,
  founderCodeError,
  categories,
  saving,
  onDetailsChange,
  onFounderCodeChange,
  onCauseSubmit,
  onVisualSubmit,
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

  if (stage === 'visual') {
    const organization: NGO = {
      id: 'organization-visual-preview',
      name: organizationName.trim() || 'Sua organização',
      description: details.description.trim(),
      category: details.category.trim() || 'Causa',
      goal: details.goal.trim(),
      objectives: details.objectives,
      image: avatar ?? '',
      coverImage: details.coverImage.trim() || undefined,
      email: details.publicEmail,
      instagram: details.instagram,
      phone: details.phone || undefined,
      verified: false,
      status: details.status,
      isFounder: details.isFounder,
      posts: [],
    };
    return <div ref={scope}><NGOVisualOnboardingStep organization={organization} saving={saving} onSubmit={onVisualSubmit} /></div>;
  }

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

          <label className={labelClass} htmlFor='setup-cause-goal'>
            O que vocês querem tornar possível agora?
            <textarea id='setup-cause-goal' value={details.goal} onChange={(event) => onDetailsChange({ goal: event.target.value })} placeholder='Conte qual é a prioridade mais importante da organização neste momento.' rows={4} maxLength={400} className={`${fieldClass} resize-y leading-6`} />
          </label>

          <div className='grid gap-4 sm:grid-cols-[1fr_9rem]'>
            <label className={labelClass} htmlFor='setup-cause-city'>
              Onde vocês atuam?
              <SmoothInput id='setup-cause-city' value={details.city ?? ''} onChange={(event) => onDetailsChange({ city: event.target.value })} placeholder='Cidade' className={fieldClass} />
            </label>
            <label className={labelClass} htmlFor='setup-cause-state'>
              Estado
              <select id='setup-cause-state' value={details.state ?? ''} onChange={(event) => onDetailsChange({ state: event.target.value })} className={fieldClass}>
                <option value=''>UF</option>
                {BRAZILIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
          </div>

          <section className='rounded-[28px] bg-gradient-to-br from-brand-yellow via-brand-yellow/55 to-brand-blue/45 p-[2px] shadow-[0_22px_55px_-32px_rgba(28,169,229,0.65)]'>
            <div className='relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,hsl(var(--background))_0%,rgba(255,247,199,0.72)_52%,rgba(224,247,255,0.9)_100%)] px-4 py-5 sm:px-5'>
              <div className='pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-brand-yellow/25' aria-hidden='true' />
              <div className='relative flex items-start gap-4'>
                <div className='grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/85 p-2 ring-1 ring-brand-yellow/45 shadow-[0_12px_30px_-18px_rgba(15,36,60,0.48)]'>
                  <img src={founderSeal} alt='Selo de ONG fundadora' className='h-full w-full object-contain' />
                </div>
                <div className='min-w-0 flex-1'>
                  <span className='inline-flex rounded-full bg-brand-yellow/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-ink'>Convite fundador</span>
                  <h2 className='mt-2 text-lg font-black tracking-[-0.02em] text-brand-ink'>Faça parte de quem acreditou primeiro.</h2>
                  <p className='mt-1 max-w-md text-xs leading-5 text-brand-ink/65'>O código reconhece oficialmente a organização como uma das ONGs fundadoras do TranquiliCare.</p>
                </div>
              </div>

              <label className='relative mt-5 block text-sm font-black text-brand-ink' htmlFor='setup-founder-code'>
                Código de ONG fundadora
                <SmoothInput
                  id='setup-founder-code'
                  value={founderCode}
                  onChange={(event) => onFounderCodeChange(event.target.value)}
                  placeholder='TC-NOME-DA-ONG'
                  autoComplete='off'
                  autoCapitalize='characters'
                  spellCheck={false}
                  maxLength={64}
                  aria-invalid={Boolean(founderCodeError)}
                  aria-describedby={founderCodeError ? 'setup-founder-code-error' : 'setup-founder-code-help'}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
                  className={`mt-2 min-h-14 w-full rounded-2xl border-2 bg-white/90 px-4 font-black uppercase tracking-[0.08em] text-brand-ink outline-none transition-[border-color,box-shadow,transform] duration-500 placeholder:font-semibold placeholder:tracking-[0.04em] placeholder:text-brand-ink/30 focus:-translate-y-0.5 focus:ring-4 ${founderCodeError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-brand-yellow/80 focus:border-brand-blue focus:ring-brand-blue/10'}`}
                />
                {founderCodeError ? (
                  <span id='setup-founder-code-error' className='mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold normal-case leading-5 tracking-normal text-red-700' role='alert'>
                    <span className='mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500' aria-hidden='true' />
                    {founderCodeError}
                  </span>
                ) : (
                  <span id='setup-founder-code-help' className='mt-2 block text-xs font-medium normal-case leading-5 tracking-normal text-brand-ink/55'>Use o formato TC-NOME-DA-ONG. O campo é opcional e exclusivo para organizações convidadas.</span>
                )}
              </label>
            </div>
          </section>

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
