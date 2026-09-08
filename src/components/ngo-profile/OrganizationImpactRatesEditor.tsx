import { Loader2, Plus } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SmoothInput } from '@/components/ui/smooth-input';

import { toImpactCategory } from '@/lib/impact-scale/repository';
import { supabase } from '@/lib/supabase';

interface Props {
  organizationId: string;
  category: string;
}

interface UnitRow {
  key: string;
  singular: string;
  plural: string;
  unit_type: 'discrete' | 'continuous';
}

interface RateRow {
  id: string;
  impact_unit_key: string;
  base_amount_cents: number;
  base_quantity_milli: number;
  source_description: string;
  is_verified: boolean;
  is_active: boolean;
}

const parseDecimal = (value: string) => Number(value.replace(',', '.'));

const OrganizationImpactRatesEditor = ({ organizationId, category }: Props) => {
  const canonicalCategory = useMemo(() => toImpactCategory(category), [category]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitKey, setUnitKey] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !canonicalCategory) {
      setLoading(false);
      return;
    }
    const [unitResult, rateResult] = await Promise.all([
      supabase.from('impact_units').select('key, singular, plural, unit_type').eq('category', canonicalCategory).eq('active', true).order('singular'),
      supabase.from('organization_impact_rates').select('id, impact_unit_key, base_amount_cents, base_quantity_milli, source_description, is_verified, is_active').eq('organization_id', organizationId).eq('is_active', true).order('created_at'),
    ]);
    if (unitResult.error || rateResult.error) throw unitResult.error ?? rateResult.error;
    const nextUnits = (unitResult.data ?? []) as UnitRow[];
    setUnits(nextUnits);
    setUnitKey((current) => current || nextUnits[0]?.key || '');
    setRates((rateResult.data ?? []) as RateRow[]);
  }, [canonicalCategory, organizationId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void load()
      .catch(() => {
        if (active) toast.error('Não foi possível carregar as relações de impacto.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !canonicalCategory || rates.length >= 3) return;
    const amountReais = parseDecimal(amount);
    const quantityValue = parseDecimal(quantity);
    if (!Number.isFinite(amountReais) || amountReais <= 0 || !Number.isFinite(quantityValue) || quantityValue <= 0) {
      toast.error('Informe um valor e uma quantidade maiores que zero.');
      return;
    }
    if (source.trim().length < 10) {
      toast.error('Explique em pelo menos 10 caracteres de onde vem essa relação.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('organization_impact_rates').insert({
      organization_id: organizationId,
      category: canonicalCategory,
      impact_unit_key: unitKey,
      base_amount_cents: Math.round(amountReais * 100),
      base_quantity_milli: Math.floor(quantityValue * 1000),
      source_description: source.trim(),
      is_active: true,
      is_verified: false,
    });
    if (error) {
      toast.error(error.message.includes('limit') ? 'Sua organização já possui três relações ativas.' : 'Não foi possível enviar essa relação para análise.');
      setSaving(false);
      return;
    }
    setAmount('');
    setQuantity('');
    setSource('');
    await load();
    setSaving(false);
    toast.success('Relação enviada para análise do TranquiliCare.');
  };

  if (!canonicalCategory) return null;

  return (
    <section className='mx-auto mt-8 w-full max-w-6xl px-4 pb-8' aria-labelledby='impact-rates-title'>
      <div className='rounded-[26px] border border-brand-ink/10 bg-background p-5 shadow-sm sm:p-7'>
        <p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Escala de Impacto</p>
        <h2 id='impact-rates-title' className='mt-2 font-display text-2xl font-semibold text-brand-ink'>Ajude as pessoas a entenderem o que um valor pode tornar possível.</h2>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>Cadastre até três relações baseadas nos custos reais da sua organização. Uma nova relação só aparece publicamente depois da análise do TranquiliCare.</p>

        {loading ? (
          <div className='grid min-h-28 place-items-center text-brand-blue' role='status'><Loader2 className='animate-spin' /><span className='sr-only'>Carregando relações</span></div>
        ) : (
          <>
            {rates.length > 0 && (
              <ul className='mt-5 grid gap-3 md:grid-cols-3'>
                {rates.map((rate) => {
                  const unit = units.find((item) => item.key === rate.impact_unit_key);
                  return (
                    <li key={rate.id} className='rounded-2xl border border-brand-ink/10 bg-secondary/50 p-4'>
                      <p className='text-sm font-bold text-brand-ink'>R$ {(rate.base_amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → {(rate.base_quantity_milli / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {rate.base_quantity_milli === 1000 ? unit?.singular : unit?.plural}</p>
                      <p className='mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground'>{rate.source_description}</p>
                      <span className={'mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ' + (rate.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-yellow/25 text-brand-ink')}>
                        {rate.is_verified ? 'Verificada' : 'Em análise'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {rates.length < 3 ? (
              <form onSubmit={submit} className='mt-6 grid gap-4 rounded-2xl border border-brand-blue/15 bg-brand-blue/[0.04] p-4 md:grid-cols-2' noValidate>
                <label className='text-sm font-bold text-brand-ink'>Valor em reais
                  <SmoothInput value={amount} onChange={(event) => setAmount(event.target.value)} inputMode='decimal' placeholder='Ex.: 20,00' className='mt-2 h-11 w-full rounded-xl border border-brand-ink/15 bg-background px-3 font-normal outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10' />
                </label>
                <label className='text-sm font-bold text-brand-ink'>Quantidade
                  <SmoothInput value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode='decimal' placeholder='Ex.: 2' className='mt-2 h-11 w-full rounded-xl border border-brand-ink/15 bg-background px-3 font-normal outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10' />
                </label>
                <label className='text-sm font-bold text-brand-ink'>Unidade de impacto
                  <select value={unitKey} onChange={(event) => setUnitKey(event.target.value)} className='mt-2 h-11 w-full rounded-xl border border-brand-ink/15 bg-background px-3 font-normal outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10'>
                    {units.map((unit) => <option key={unit.key} value={unit.key}>{unit.plural}</option>)}
                  </select>
                </label>
                <label className='text-sm font-bold text-brand-ink'>Como esse valor foi calculado?
                  <SmoothInput value={source} onChange={(event) => setSource(event.target.value)} placeholder='Ex.: média das notas fiscais dos últimos 3 meses' className='mt-2 h-11 w-full rounded-xl border border-brand-ink/15 bg-background px-3 font-normal outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10' />
                </label>
                <button type='submit' disabled={saving || !unitKey} className='tc-button-3d flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold text-white disabled:opacity-60 md:col-span-2'>
                  {saving ? <Loader2 size={18} className='animate-spin' /> : <Plus size={18} />}
                  {saving ? 'Enviando...' : 'Enviar relação para análise'}
                </button>
              </form>
            ) : (
              <p className='mt-5 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground'>Limite de três relações ativas atingido.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default OrganizationImpactRatesEditor;