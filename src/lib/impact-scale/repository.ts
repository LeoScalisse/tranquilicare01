import { supabase } from '@/lib/supabase';
import { selectHumanScale, translateImpact } from './index';
import type { ImpactCategory, ImpactRate, ImpactRelation, ImpactTranslation, ImpactUnit } from './types';

const CATEGORY_ALIASES: Record<string, ImpactCategory> = {
  educacao: 'education',
  educação: 'education',
  education: 'education',
  saude: 'health',
  saúde: 'health',
  health: 'health',
  'saude mental': 'mental_health',
  'saúde mental': 'mental_health',
  mental_health: 'mental_health',
  social: 'social',
  pets: 'pets',
  ambiente: 'environment',
  'meio ambiente': 'environment',
  environment: 'environment',
};

const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export const toImpactCategory = (value: string): ImpactCategory | null => CATEGORY_ALIASES[normalize(value)] ?? null;

export const loadImpactTranslation = async (
  organizationId: string,
  categoryLabel: string,
  amountCents: number,
): Promise<ImpactTranslation | null> => {
  if (!supabase || !organizationId || amountCents <= 0) return null;
  const category = toImpactCategory(categoryLabel);
  if (!category) return null;

  const { data: rates, error: ratesError } = await supabase
    .from('organization_impact_rates')
    .select('id, organization_id, category, impact_unit_key, base_amount_cents, base_quantity_milli, source_description, is_active, is_verified')
    .eq('organization_id', organizationId)
    .eq('category', category)
    .eq('is_active', true)
    .eq('is_verified', true)
    .order('created_at', { ascending: true })
    .limit(3);
  if (ratesError || !rates?.length) return null;

  const row = rates[amountCents % rates.length];
  const [{ data: units, error: unitError }, { data: relations, error: relationError }] = await Promise.all([
    supabase.from('impact_units').select('key, category, singular, plural, unit_type').eq('key', row.impact_unit_key).eq('category', category).limit(1),
    supabase.from('impact_scale_relations').select('key, category, impact_unit_key, template, reference_key, is_estimate, priority').eq('impact_unit_key', row.impact_unit_key).eq('category', category).order('priority'),
  ]);
  if (unitError || relationError || !units?.[0]) return null;

  const rate: ImpactRate = {
    id: row.id,
    organizationId: row.organization_id,
    category: row.category,
    impactUnitKey: row.impact_unit_key,
    baseAmountCents: row.base_amount_cents,
    baseQuantityMilli: row.base_quantity_milli,
    sourceDescription: row.source_description,
    isActive: row.is_active,
    isVerified: row.is_verified,
  };
  const unit: ImpactUnit = {
    key: units[0].key,
    category: units[0].category,
    singular: units[0].singular,
    plural: units[0].plural,
    unitType: units[0].unit_type,
  };
  const mappedRelations: ImpactRelation[] = (relations ?? []).map((relation) => ({
    key: relation.key,
    category: relation.category,
    impactUnitKey: relation.impact_unit_key,
    template: relation.template,
    referenceKey: relation.reference_key,
    isEstimate: relation.is_estimate,
    priority: relation.priority,
  }));
  return translateImpact({ amountCents, rate, unit, relations: mappedRelations });
};
export const loadMetricHumanScale = async (
  organizationId: string,
  categoryLabel: string,
  impactUnitKey: string,
  quantity: number,
): Promise<string | null> => {
  if (!supabase || !Number.isFinite(quantity) || quantity <= 0) return null;
  const category = toImpactCategory(categoryLabel);
  if (!category) return null;

  const [{ data: rates, error: rateError }, { data: relations, error: relationError }] = await Promise.all([
    supabase.from('organization_impact_rates').select('id').eq('organization_id', organizationId).eq('category', category).eq('impact_unit_key', impactUnitKey).eq('is_active', true).eq('is_verified', true).limit(1),
    supabase.from('impact_scale_relations').select('key, category, impact_unit_key, template, reference_key, is_estimate, priority').eq('category', category).eq('impact_unit_key', impactUnitKey).order('priority'),
  ]);
  if (rateError || relationError || !rates?.length) return null;
  const mappedRelations: ImpactRelation[] = (relations ?? []).map((relation) => ({
    key: relation.key,
    category: relation.category,
    impactUnitKey: relation.impact_unit_key,
    template: relation.template,
    referenceKey: relation.reference_key,
    isEstimate: relation.is_estimate,
    priority: relation.priority,
  }));
  return selectHumanScale(Math.floor(quantity * 1000), mappedRelations)?.text ?? null;
};