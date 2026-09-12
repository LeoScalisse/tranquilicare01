import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260911113000_harden_public_campaigns_view.sql'),
  'utf8',
);

describe('public campaigns security migration', () => {
  it('makes the public view obey the caller RLS policies', () => {
    expect(migration).toContain(
      'with (security_barrier = true, security_invoker = true)',
    );
  });

  it('does not let the public view bypass donation RLS to calculate progress', () => {
    const viewDefinition = migration.slice(
      migration.indexOf('create or replace view public.public_campaigns'),
    );

    expect(viewDefinition).toContain('campaign.raised_amount_cents');
    expect(viewDefinition).not.toContain('join public.donations');
    expect(viewDefinition).not.toContain('private.production_metric_baseline');
  });

  it('maintains production totals through a private, hardened trigger only', () => {
    expect(migration).toContain(
      'create or replace function private.sync_campaign_raised_amount()',
    );
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      'revoke all on function private.sync_campaign_raised_amount() from public, anon, authenticated',
    );
    expect(migration).toContain("donation.status = 'succeeded'");
    expect(migration).toContain('not donation.is_test');
  });
});
