import { supabase } from '@/lib/supabase';

export interface CampaignSubmissionInput {
  beneficiaryOrganizationId: string;
  title: string;
  summary: string;
  story: string;
  goalAmountCents: number;
  endsAt: string;
  coverUrl?: string;
  acceptedTerms: boolean;
}

export interface PublicCampaign {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationImage: string;
  organizationCoverImage: string;
  title: string;
  description: string;
  goalAmountCents: number;
  raisedAmountCents: number;
  endsAt: string | null;
  status: 'active' | 'completed';
  coverUrl: string;
}

export const submitCampaignForReview = async (input: CampaignSubmissionInput): Promise<string> => {
  if (!supabase) throw new Error('backend-unavailable');
  const { data, error } = await supabase.rpc('submit_campaign_for_review', {
    beneficiary_organization_id: input.beneficiaryOrganizationId,
    campaign_title: input.title,
    campaign_summary: input.summary,
    campaign_story: input.story,
    campaign_goal_amount_cents: input.goalAmountCents,
    campaign_ends_at: input.endsAt,
    campaign_cover_url: input.coverUrl?.trim() || null,
    accepted_terms: input.acceptedTerms,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('campaign-submission-not-persisted');
  return data;
};

export const loadPublicCampaigns = async (): Promise<PublicCampaign[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('public_campaigns')
    .select('id, organization_id, organization_name, organization_image, organization_cover_image, title, description, goal_amount_cents, raised_amount_cents, ends_at, status, cover_url')
    .order('created_at', { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    organizationId: String(row.organization_id),
    organizationName: String(row.organization_name ?? ''),
    organizationImage: String(row.organization_image ?? ''),
    organizationCoverImage: String(row.organization_cover_image ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    goalAmountCents: Number(row.goal_amount_cents) || 0,
    raisedAmountCents: Number(row.raised_amount_cents) || 0,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    status: row.status === 'completed' ? 'completed' : 'active',
    coverUrl: String(row.cover_url ?? ''),
  }));
};

export const campaignSubmissionErrorMessage = (error: unknown) => {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : error instanceof Error ? error.message : '';
  if (message.includes('campaign-beneficiary-unavailable')) return 'Essa organização ainda não está apta a receber doações.';
  if (message.includes('campaign-submission-rate-limit')) return 'Você já enviou três propostas nas últimas 24 horas. Tente novamente amanhã.';
  if (message.includes('campaign-deadline-invalid')) return 'Escolha uma data entre 8 dias e 1 ano a partir de hoje.';
  if (message.includes('campaign-terms-required')) return 'Confirme que as informações são verdadeiras antes de enviar.';
  if (message.includes('authentication-required')) return 'Sua sessão terminou. Entre novamente para enviar a vaquinha.';
  if (message.includes('backend-unavailable')) return 'O banco ainda não está conectado. Não foi possível enviar a vaquinha.';
  return 'Não foi possível enviar a vaquinha para análise. Revise os campos e tente novamente.';
};
