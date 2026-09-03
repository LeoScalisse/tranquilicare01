import type { NgoOnboardingStage } from '@/lib/authTypes';
import { supabase } from '@/lib/supabase';

const STAGES: NgoOnboardingStage[] = ['cause', 'visual', 'preparation', 'complete'];

export const setupValueForOnboardingStage = (stage: NgoOnboardingStage): string | null => {
  if (stage === 'cause') return '1';
  if (stage === 'visual') return 'visual';
  if (stage === 'preparation') return '4';
  return null;
};

export const advanceOwnOrganizationOnboarding = async (
  stage: NgoOnboardingStage,
): Promise<NgoOnboardingStage> => {
  if (!supabase) return stage;
  const { data, error } = await supabase.rpc('advance_own_organization_onboarding', {
    requested_stage: stage,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  const persisted = typeof result === 'string'
    ? result
    : result && typeof result === 'object' && 'onboarding_stage' in result
      ? result.onboarding_stage
      : null;
  if (!STAGES.includes(persisted as NgoOnboardingStage)) {
    throw new Error('organization-onboarding-stage-not-persisted');
  }
  return persisted as NgoOnboardingStage;
};
