import { supabase } from './supabase';

// Discovery exclusion only. Admin authorization always comes from the server.
export const INTERNAL_ORGANIZATION_ID = 'a1e70beb-0324-43d5-a806-780252c232c4';

export interface AdminUser {
  id: string; name: string; email: string; account_type: 'donor' | 'ngo'; created_at: string;
  donation_count: number; donated_cents: number; received_cents: number; story_count: number;
  conversation_count: number; sent_message_count: number; received_message_count: number;
}
export interface AdminDonation {
  id: string; amount_cents: number; status: string; created_at: string;
  organization_name: string | null; direction: 'sent' | 'received';
}
export type OrganizationVerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export interface AdminOrganizationVerification {
  organization_id: string;
  name: string;
  public_email: string | null;
  cnpj: string | null;
  address: string;
  city: string | null;
  state: string | null;
  organization_status: string;
  verification_status: OrganizationVerificationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  internal_notes: string | null;
  updated_at: string;
  document_count: number;
  accepted_document_count: number;
  mercado_pago_connected: boolean;
  payout_status: string | null;
  payment_status: string | null;
}
export async function getPlatformAdminAccess(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('get_platform_admin_access');
  if (error) throw error;
  return data === true;
}
export async function listAdminUsers(search: string, type: string, page: number): Promise<{total: number; users: AdminUser[]}> {
  if (!supabase) throw new Error('admin_unavailable');
  const { data, error } = await supabase.rpc('admin_list_users', { search_term: search, account_filter: type, page_number: page });
  if (error) throw error;
  return data;
}
export async function listAdminDonations(profileId: string, page: number): Promise<{total: number; donations: AdminDonation[]}> {
  if (!supabase) throw new Error('admin_unavailable');
  const { data, error } = await supabase.rpc('admin_user_donations', {target_profile_id: profileId, page_number: page});
  if (error) throw error;
  return data;
}

export async function listAdminOrganizationVerifications(
  status: 'queue' | OrganizationVerificationStatus | 'all',
  page: number,
): Promise<{ total: number; verifications: AdminOrganizationVerification[] }> {
  if (!supabase) throw new Error('admin_unavailable');
  const { data, error } = await supabase.rpc('admin_list_organization_verifications', {
    status_filter: status,
    page_number: page,
  });
  if (error) throw error;
  return data as { total: number; verifications: AdminOrganizationVerification[] };
}

export async function reviewAdminOrganizationVerification(
  organizationId: string,
  decision: 'approved' | 'rejected',
  notes: string,
): Promise<void> {
  if (!supabase) throw new Error('admin_unavailable');
  const { data, error } = await supabase
    .from('organization_verifications')
    .update({
      status: decision,
      internal_notes: notes.trim() || null,
    })
    .eq('organization_id', organizationId)
    .select('organization_id,status')
    .single();
  if (error) throw error;
  if (!data || data.status !== decision) throw new Error('verification_not_persisted');
}
