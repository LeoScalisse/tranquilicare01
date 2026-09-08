import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Check, FileSearch, HeartHandshake, Image as ImageIcon, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import AppBottomNav from '@/components/AppBottomNav';
import logo from '@/assets/logo.png';
import { authReady, getUser, type AppUser } from '@/lib/auth';
import { campaignSubmissionErrorMessage, submitCampaignForReview } from '@/lib/campaigns';
import { loadMarketplaceNgos } from '@/lib/ngos';
import type { NGO } from '@/types';
import { SmoothInput } from '@/components/ui/smooth-input';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';

const DRAFT_KEY = 'tc-campaign-draft-v1';
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

type Draft = {
  beneficiaryOrganizationId: string;
  title: string;
  summary: string;
  story: string;
  goal: string;
  endsAt: string;
  coverUrl: string;
  acceptedTerms: boolean;
};

const EMPTY_DRAFT: Draft = {
  beneficiaryOrganizationId: '',
  title: '',
  summary: '',
  story: '',
  goal: '',
  endsAt: addDays(30),
  coverUrl: '',
  acceptedTerms: false,
};

const loadDraft = (): Draft => {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as Partial<Draft> | null;
    return stored ? { ...EMPTY_DRAFT, ...stored, acceptedTerms: false } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
};

const parseGoalCents = (value: string) => {
  const normalized = value.replace(/[^\d,]/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

const CreateCampaign: React.FC = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [user, setUser] = useState<AppUser | null>(null);
  const [organizations, setOrganizations] = useState<NGO[]>([]);
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState('');

  useEffect(() => {
    let active = true;
    void authReady.then(async () => {
      const current = getUser();
      if (!current) {
        navigate('/donor/auth?mode=login&returnTo=%2Fcampaign%2Fnew', { replace: true });
        return;
      }
      const available = await loadMarketplaceNgos(current).catch(() => []);
      if (!active) return;
      setUser(current);
      setOrganizations(available);
      setDraft((value) => {
        if (value.beneficiaryOrganizationId) return value;
        const own = current.accountType === 'ngo'
          ? available.find((organization) => organization.id === current.id) ?? available[0]
          : null;
        return own ? { ...value, beneficiaryOrganizationId: own.id } : value;
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (loading || submissionId) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, acceptedTerms: false }));
  }, [draft, loading, submissionId]);

  const eligibleOrganizations = useMemo(() => user?.accountType === 'ngo'
    ? organizations.filter((organization) => organization.id === user.id).slice(0, 1)
    : organizations.filter((organization) => organization.donationsEnabled), [organizations, user]);

  const update = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof Draft, string>> = {};
    if (!draft.beneficiaryOrganizationId) next.beneficiaryOrganizationId = 'Escolha a organização que receberá as doações.';
    if (draft.title.trim().length < 8) next.title = 'Use pelo menos 8 caracteres.';
    if (draft.summary.trim().length < 30) next.summary = 'Resuma o objetivo em pelo menos 30 caracteres.';
    if (draft.story.trim().length < 100) next.story = 'Conte a história em pelo menos 100 caracteres para apoiar a análise.';
    const goal = parseGoalCents(draft.goal);
    if (goal < 5000 || goal > 100_000_000) next.goal = 'Defina uma meta entre R$ 50 e R$ 1.000.000.';
    if (!draft.endsAt || draft.endsAt < addDays(8) || draft.endsAt > addDays(365)) next.endsAt = 'Escolha uma data entre 8 dias e 1 ano.';
    if (draft.coverUrl && !/^https:\/\//i.test(draft.coverUrl)) next.coverUrl = 'Use um endereço seguro iniciado por https://.';
    if (!draft.acceptedTerms) next.acceptedTerms = 'Confirme a veracidade das informações.';
    setErrors(next);
    const first = Object.keys(next)[0] as keyof Draft | undefined;
    if (first) document.getElementById(`campaign-${first}`)?.focus();
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const id = await submitCampaignForReview({
        beneficiaryOrganizationId: draft.beneficiaryOrganizationId,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        story: draft.story.trim(),
        goalAmountCents: parseGoalCents(draft.goal),
        endsAt: new Date(`${draft.endsAt}T23:59:59-03:00`).toISOString(),
        coverUrl: draft.coverUrl.trim(),
        acceptedTerms: draft.acceptedTerms,
      });
      localStorage.removeItem(DRAFT_KEY);
      setSubmissionId(id);
    } catch (error) {
      toast.error(campaignSubmissionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className='grid min-h-screen place-items-center bg-background' aria-busy='true'><Loader2 className='animate-spin text-brand-blue' /><span className='sr-only'>Carregando criação de vaquinha</span></main>;

  if (submissionId) {
    return (
      <main className='grid min-h-screen place-items-center bg-[#eaf8fc] px-5 py-12 text-brand-ink'>
        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className='w-full max-w-xl rounded-[30px] border border-brand-blue/15 bg-background p-7 text-center shadow-[0_30px_80px_-48px_rgba(8,78,116,0.5)] sm:p-10' role='status'>
          <span className='mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-brand-blue text-white'><FileSearch size={30} /></span>
          <p className='mt-6 text-xs font-black uppercase tracking-[0.14em] text-brand-blue'>Proposta recebida</p>
          <h1 className='mt-2 text-balance font-display text-3xl font-semibold'>Sua vaquinha vai passar pela análise do TranquiliCare</h1>
          <p className='mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground'>Vamos verificar a causa, a organização beneficiária e as informações enviadas antes de qualquer publicação. Você poderá receber um pedido de ajuste durante essa etapa.</p>
          <div className='mt-7 grid grid-cols-3 gap-2 text-left text-xs font-semibold'>
            <span className='rounded-xl bg-brand-blue/10 p-3 text-brand-blue'><Check className='mb-2 h-4 w-4' />Enviada</span>
            <span className='rounded-xl bg-brand-yellow/25 p-3'><FileSearch className='mb-2 h-4 w-4' />Em análise</span>
            <span className='rounded-xl bg-secondary p-3 text-muted-foreground'><ShieldCheck className='mb-2 h-4 w-4' />Publicação</span>
          </div>
          <p className='mt-5 text-xs text-muted-foreground'>Protocolo {submissionId.slice(0, 8).toUpperCase()}</p>
          <button type='button' onClick={() => navigate(user?.accountType === 'ngo' ? '/ngo/profile' : '/donor/profile')} className='tc-button-3d mt-7 min-h-12 rounded-xl px-6 text-sm font-bold text-white'>Voltar ao meu perfil</button>
        </motion.section>
      </main>
    );
  }

  const inputClass = 'mt-2 w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10';
  const errorClass = 'mt-1.5 text-sm font-semibold text-red-600';
  return (
    <div className='min-h-screen bg-[#eaf8fc] pb-24 text-brand-ink'>
      <AppBottomNav activeKey='perfil' user={user} />
      <header className='sticky top-0 z-40 border-b border-brand-blue/10 bg-background/95 backdrop-blur-xl'>
        <div className='mx-auto flex h-16 max-w-5xl items-center justify-between px-4'>
          <button type='button' onClick={() => navigate(-1)} className='inline-flex items-center gap-2 rounded-lg px-2 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'><ArrowLeft size={19} />Voltar</button>
          <img src={logo} alt='TranquiliCare' className='h-9 w-9 rounded-lg' />
        </div>
      </header>

      <main className='mx-auto max-w-5xl px-4 py-8 sm:py-12'>
        <div className='mb-8 max-w-2xl'>
          <p className='text-xs font-black uppercase tracking-[0.15em] text-brand-blue'>Criar vaquinha</p>
          <h1 className='mt-2 text-balance font-display text-4xl font-semibold leading-tight sm:text-5xl'>Transforme uma causa em mobilização.</h1>
          <p className='mt-4 max-w-xl leading-7 text-muted-foreground'>Preencha a proposta com informações verificáveis. Nada será publicado ou cobrado antes da análise do TranquiliCare.</p>
        </div>

        <form onSubmit={submit} noValidate className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]'>
          <section className='space-y-6 rounded-[28px] border border-brand-ink/10 bg-background p-5 shadow-[0_24px_65px_-48px_rgba(8,62,91,0.48)] sm:p-7' aria-labelledby='campaign-details-title'>
            <div><p className='text-xs font-bold text-brand-blue'>Etapa 1 de 3</p><h2 id='campaign-details-title' className='font-display text-2xl font-semibold'>Conte o que precisa acontecer</h2></div>
            <label className='block text-sm font-bold' htmlFor='campaign-beneficiaryOrganizationId'>Organização beneficiária
              <select id='campaign-beneficiaryOrganizationId' value={draft.beneficiaryOrganizationId} disabled={user?.accountType === 'ngo'} onChange={(event) => update('beneficiaryOrganizationId', event.target.value)} aria-invalid={Boolean(errors.beneficiaryOrganizationId)} aria-describedby={errors.beneficiaryOrganizationId ? 'campaign-beneficiary-error' : undefined} className={inputClass}>
                <option value=''>Selecione uma organização verificada</option>
                {eligibleOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
              {errors.beneficiaryOrganizationId ? <span id='campaign-beneficiary-error' role='alert' className={errorClass}>{errors.beneficiaryOrganizationId}</span> : null}
            </label>
            <label className='block text-sm font-bold' htmlFor='campaign-title'>Título
              <SmoothInput id='campaign-title' value={draft.title} maxLength={100} onChange={(event) => update('title', event.target.value)} aria-invalid={Boolean(errors.title)} className={inputClass} placeholder='Ex.: Uma nova sala para acolher 40 crianças' />
              <span className='mt-1 flex justify-between text-xs font-normal text-muted-foreground'><span>{errors.title || 'Seja específico sobre o resultado.'}</span><span>{draft.title.length}/100</span></span>
            </label>
            <label className='block text-sm font-bold' htmlFor='campaign-summary'>Resumo
              <SmoothTextarea id='campaign-summary' value={draft.summary} maxLength={280} rows={3} onChange={(event) => update('summary', event.target.value)} aria-invalid={Boolean(errors.summary)} className={inputClass} placeholder='Explique em poucas linhas para onde irão os recursos.' />
              <span className='mt-1 flex justify-between text-xs font-normal text-muted-foreground'><span>{errors.summary || 'Este texto aparecerá no cartão da vaquinha.'}</span><span>{draft.summary.length}/280</span></span>
            </label>
            <label className='block text-sm font-bold' htmlFor='campaign-story'>História e plano de uso
              <SmoothTextarea id='campaign-story' value={draft.story} maxLength={5000} rows={8} onChange={(event) => update('story', event.target.value)} aria-invalid={Boolean(errors.story)} className={inputClass} placeholder='Contexto, pessoas beneficiadas, etapas e como a organização prestará contas.' />
              <span className='mt-1 flex justify-between text-xs font-normal text-muted-foreground'><span>{errors.story || 'Inclua informações que a equipe possa verificar.'}</span><span>{draft.story.length}/5000</span></span>
            </label>
            <div className='grid gap-5 sm:grid-cols-2'>
              <label className='block text-sm font-bold' htmlFor='campaign-goal'>Meta em reais
                <span className='relative block'><span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground'>R$</span><SmoothInput id='campaign-goal' inputMode='decimal' value={draft.goal} onChange={(event) => update('goal', event.target.value)} aria-invalid={Boolean(errors.goal)} className={`${inputClass} pl-12`} placeholder='5.000,00' /></span>
                {errors.goal ? <span role='alert' className={errorClass}>{errors.goal}</span> : null}
              </label>
              <label className='block text-sm font-bold' htmlFor='campaign-endsAt'>Data de encerramento
                <input id='campaign-endsAt' type='date' min={addDays(8)} max={addDays(365)} value={draft.endsAt} onChange={(event) => update('endsAt', event.target.value)} aria-invalid={Boolean(errors.endsAt)} className={inputClass} />
                {errors.endsAt ? <span role='alert' className={errorClass}>{errors.endsAt}</span> : null}
              </label>
            </div>
            <label className='block text-sm font-bold' htmlFor='campaign-coverUrl'>Imagem de capa <span className='font-normal text-muted-foreground'>(opcional)</span>
              <span className='relative block'><ImageIcon className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' /><SmoothInput id='campaign-coverUrl' type='url' value={draft.coverUrl} onChange={(event) => update('coverUrl', event.target.value)} aria-invalid={Boolean(errors.coverUrl)} className={`${inputClass} pl-11`} placeholder='https://...' /></span>
              {errors.coverUrl ? <span role='alert' className={errorClass}>{errors.coverUrl}</span> : null}
            </label>
          </section>

          <aside className='space-y-4 lg:sticky lg:top-24 lg:self-start'>
            <div className='overflow-hidden rounded-[26px] bg-brand-ink text-white shadow-xl'>
              <div className='relative aspect-[4/3] bg-brand-blue/30'>
                {draft.coverUrl ? <img src={draft.coverUrl} alt='' className='h-full w-full object-cover' /> : <div className='grid h-full place-items-center'><HeartHandshake className='h-14 w-14 text-brand-yellow' /></div>}
                <div className='absolute inset-0 bg-gradient-to-t from-brand-ink via-transparent to-transparent' />
              </div>
              <div className='p-5'><p className='text-xs font-bold uppercase tracking-[0.12em] text-brand-yellow'>Prévia da vaquinha</p><h2 className='mt-2 text-balance font-display text-xl font-semibold'>{draft.title || 'O título da sua vaquinha'}</h2><p className='mt-2 line-clamp-3 text-sm leading-5 text-white/75'>{draft.summary || 'O resumo da causa aparecerá aqui.'}</p><div className='mt-5 h-2 overflow-hidden rounded-full bg-white/15'><span className='block h-full w-[8%] rounded-full bg-brand-yellow' /></div><div className='mt-2 flex justify-between text-xs'><span>Em análise</span><span>{draft.goal ? `Meta R$ ${draft.goal}` : 'Defina a meta'}</span></div></div>
            </div>
            <div className='rounded-[22px] border border-brand-blue/15 bg-background p-5'>
              <div className='flex gap-3'><CalendarDays className='mt-0.5 h-5 w-5 shrink-0 text-brand-blue' /><p className='text-sm leading-6 text-muted-foreground'>Após o envio, a equipe analisa identidade, destino dos recursos e clareza das informações. A publicação não é automática.</p></div>
              <label className='mt-5 flex cursor-pointer items-start gap-3 text-sm font-semibold' htmlFor='campaign-acceptedTerms'><input id='campaign-acceptedTerms' type='checkbox' checked={draft.acceptedTerms} onChange={(event) => update('acceptedTerms', event.target.checked)} className='mt-1 h-4 w-4 accent-[#38b6ff]' /><span>Confirmo que as informações são verdadeiras e podem ser verificadas pelo TranquiliCare.</span></label>
              {errors.acceptedTerms ? <p role='alert' className={errorClass}>{errors.acceptedTerms}</p> : null}
              <button type='submit' disabled={submitting || eligibleOrganizations.length === 0} className='tc-button-3d mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50'>{submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : <ShieldCheck className='h-4 w-4' />}{submitting ? 'Enviando para análise' : 'Enviar para análise'}</button>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
};

export default CreateCampaign;
