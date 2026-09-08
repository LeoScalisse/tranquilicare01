import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/20260907020000_general_user_chats.sql'), 'utf8');
const chatPage = readFileSync(join(root, 'src/pages/Chats.tsx'), 'utf8');
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');

describe('general chat architecture', () => {
  it('keeps conversations private and prevents sender spoofing', () => {
    expect(migration).toContain('alter table public.chat_messages enable row level security');
    expect(migration).toContain('private.is_chat_participant(conversation_id)');
    expect(migration).toContain('sender_profile_id = (select auth.uid())');
    expect(migration).toContain('revoke all on table public.chat_messages from anon, authenticated');
    expect(migration).toContain('grant select, insert on table public.chat_messages to authenticated');
  });

  it('reuses direct chats, rate limits creation and enables realtime messages', () => {
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('chat_creation_rate_limit');
    expect(migration).toContain('alter publication supabase_realtime add table public.chat_messages');
    expect(migration).toContain('create or replace function public.start_organization_chat');
  });

  it('segments donor contacts only from approved donation history', () => {
    expect(migration).toContain("donation.status = 'succeeded'");
    expect(migration).toContain("then 'not_donor'");
    expect(migration).toContain("then 'recurring_donor'");
    expect(migration).toContain("else 'loyal_donor'");
  });

  it('exposes an authenticated, recoverable chat experience', () => {
    expect(app).toContain("path='/chats'");
    expect(chatPage).toContain('subscribeToChatInbox');
    expect(chatPage).toContain('Suas conversas começam aqui');
    expect(chatPage).toContain('setDraft(preservedDraft)');
    expect(chatPage).toContain('Doador fiel');
  });
});