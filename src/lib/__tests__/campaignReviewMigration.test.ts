import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260906010000_campaign_review_submissions.sql'),
  'utf8',
);

describe('campaign review submissions migration', () => {
  it('keeps proposals private and restricts publishing to the review process', () => {
    expect(migration).toContain('alter table public.campaign_submissions enable row level security');
    expect(migration).toContain('campaign_submissions_read_own');
    expect(migration).toContain('requester_profile_id = (select auth.uid())');
    expect(migration).not.toContain('for insert');
    expect(migration).toContain('security definer');
  });

  it('allows eligible donors and NGO administrators with server-side safeguards', () => {
    expect(migration).toContain("current_account_type not in ('donor', 'ngo')");
    expect(migration).toContain("member.role in ('owner', 'admin')");
    expect(migration).toContain('private.organization_can_receive_donations');
    expect(migration).toContain('campaign-submission-rate-limit');
    expect(migration).toContain('accepted_terms boolean default false');
  });

  it('publishes only active or completed campaigns and excludes test money', () => {
    expect(migration).toContain("campaign.status in ('active', 'completed')");
    expect(migration).toContain("donation.status = 'succeeded' and not donation.is_test");
    expect(migration).toContain('grant select on public.public_campaigns to anon, authenticated');
  });
});
