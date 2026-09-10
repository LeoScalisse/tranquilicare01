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
