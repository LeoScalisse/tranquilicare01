import { supabase } from '@/lib/supabase';

const LOCAL_KEY = 'tc-campaign-creation-interest';

export const registerCampaignCreationInterest = async (): Promise<void> => {
  if (!supabase) {
    localStorage.setItem(LOCAL_KEY, '1');
    return;
  }
  const { data, error } = await supabase.rpc('register_campaign_creation_interest');
  if (error) throw error;
  if (data !== true) throw new Error('campaign-interest-not-persisted');
};
