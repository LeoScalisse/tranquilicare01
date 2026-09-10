import type { RealtimeChannel } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export interface ChatUser {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  accountType: 'donor' | 'ngo';
}

export interface ChatConversation extends ChatUser {
  conversationId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  donorTier: 'not_donor' | 'new_donor' | 'recurring_donor' | 'loyal_donor' | null;
  approvedDonationCount: number | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderProfileId: string;
  body: string;
  sentAt: string;
}

interface ConversationRow {
  conversation_id: string;
  other_profile_id: string;
  display_name: string;
  avatar_url: string | null;
  account_type: 'donor' | 'ngo';
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | string;
  donor_tier: ChatConversation['donorTier'];
  approved_donation_count: number | string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  sent_at: string;
}

interface UserRow {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  account_type: 'donor' | 'ngo';
}

const requireChatBackend = () => {
  if (!supabase) throw new Error('chat_unavailable');
  return supabase;
};

const mapMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderProfileId: row.sender_profile_id,
  body: row.body,
  sentAt: row.sent_at,
});

export const listChatConversations = async (): Promise<ChatConversation[]> => {
  const client = requireChatBackend();
  const { data, error } = await client.rpc('list_my_chat_conversations');
  if (error) throw error;
  return ((data ?? []) as ConversationRow[]).map((row) => ({
    conversationId: row.conversation_id,
    profileId: row.other_profile_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    accountType: row.account_type,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count) || 0,
    donorTier: row.donor_tier,
    approvedDonationCount: row.approved_donation_count == null ? null : Number(row.approved_donation_count),
  }));
};

export const startOrganizationChat = async (organizationId: string): Promise<string> => {
  const client = requireChatBackend();
  const { data, error } = await client.rpc('start_organization_chat', { target_organization_id: organizationId });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('conversation_not_found');
  return data;
};

export const searchChatUsers = async (query: string): Promise<ChatUser[]> => {
  const client = requireChatBackend();
  const { data, error } = await client.rpc('search_chat_users', { search_term: query.trim() });
  if (error) throw error;
  return ((data ?? []) as UserRow[]).map((row) => ({
    profileId: row.profile_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    accountType: row.account_type,
  }));
};

export const startDirectChat = async (profileId: string): Promise<string> => {
  const client = requireChatBackend();
  const { data, error } = await client.rpc('start_direct_chat', { other_profile_id: profileId });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('conversation_not_found');
  return data;
};

export const listChatMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  const client = requireChatBackend();
  const { data, error } = await client
    .from('chat_messages')
    .select('id, conversation_id, sender_profile_id, body, sent_at')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(300);
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).reverse().map(mapMessage);
};

export const sendChatMessage = async (conversationId: string, body: string): Promise<ChatMessage> => {
  const client = requireChatBackend();
  const user = getUser();
  const normalizedBody = body.trim();
  if (!user) throw new Error('not_authenticated');
  if (!normalizedBody || normalizedBody.length > 4000) throw new Error('invalid_message');

  const { data, error } = await client.rpc('send_chat_message', {
    target_conversation_id: conversationId,
    message_body: normalizedBody,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as MessageRow | undefined;
  if (!row) throw new Error('message_not_created');
  return mapMessage(row);
};
export const markChatRead = async (conversationId: string): Promise<void> => {
  const client = requireChatBackend();
  const { error } = await client.rpc('mark_chat_read', { target_conversation_id: conversationId });
  if (error) throw error;
};

export const subscribeToChatInbox = (
  onMessage: (message: ChatMessage) => void,
): (() => void) => {
  const user = getUser();
  if (!supabase || !user) return () => undefined;
  let channel: RealtimeChannel | null = supabase
    .channel(`chat:inbox:${user.id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => onMessage(mapMessage(payload.new as MessageRow)),
    )
    .subscribe();

  return () => {
    if (channel && supabase) void supabase.removeChannel(channel);
    channel = null;
  };
};
export const subscribeToChatMessages = (
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): (() => void) => {
  if (!supabase) return () => undefined;
  let channel: RealtimeChannel | null = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(mapMessage(payload.new as MessageRow)),
    )
    .subscribe();

  return () => {
    if (channel && supabase) void supabase.removeChannel(channel);
    channel = null;
  };
};

export const getChatErrorMessage = (error: unknown): string => {
  const details = typeof error === 'object' && error !== null
    ? Object.values(error as Record<string, unknown>).filter((value) => typeof value === 'string').join(' ')
    : '';
  const message = error instanceof Error ? error.message : details || String(error ?? '');
  if (message.includes('not_authenticated')) return 'Entre na sua conta para conversar.';
  if (message.includes('invalid_recipient')) return 'Não é possível iniciar essa conversa.';
  if (message.includes('recipient_not_found')) return 'Esse perfil não está mais disponível.';
  if (message.includes('chat_creation_rate_limit')) return 'Muitas conversas foram iniciadas agora. Aguarde um pouco.';
  if (message.includes('conversation_not_found')) return 'Esta conversa não está mais disponível. Abra uma nova conversa pelo perfil.';
  if (message.includes('invalid_conversation')) return 'Esta conversa precisa ser reiniciada pelo perfil da pessoa ou organização.';
  if (message.includes('invalid_message')) return 'Escreva uma mensagem com até 4.000 caracteres.';
  if (message.includes('chat_unavailable')) return 'O chat precisa da conexão com o TranquiliCare para funcionar.';
  return 'Não foi possível concluir agora. Verifique sua conexão e tente novamente.';
};
