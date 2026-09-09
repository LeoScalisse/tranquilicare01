import { supabase } from '@/lib/supabase';

export const loadProductionMetricBaseline = async (): Promise<string> => {
  if (!supabase) return new Date(0).toISOString();

  const { data, error } = await supabase.rpc('get_production_metric_baseline');
  if (error || typeof data !== 'string') {
    throw new Error(`production-metric-baseline-unavailable:${error?.message ?? 'invalid-response'}`);
  }

  return data;
};
