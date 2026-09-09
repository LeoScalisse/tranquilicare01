import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260908160000_start_production_metrics_at_zero.sql'),
  'utf8',
);

describe('production metrics baseline migration', () => {
  it('preserves historical records without reclassifying payments', () => {
    expect(migration).not.toContain('delete from public.donations');
    expect(migration).not.toContain('delete from public.organizations');
    expect(migration).not.toContain('update public.donations');
    expect(migration).not.toContain('update public.donor_relationships');
  });

  it('resets public totals and limits future dashboard numbers to the production epoch', () => {
    expect(migration).toContain('donated_amount_cents = 0');
    expect(migration).toContain('donation_count = 0');
    expect(migration).toContain('private.production_metric_baseline');
    expect(migration).toContain('donation.created_at >=');
    expect(migration).toContain('organization.created_at >=');
  });

  it('guards realtime totals and campaign progress with the same baseline', () => {
    expect(migration).toContain('create or replace function public.update_platform_impact_stats()');
    expect(migration).toContain('new.created_at >= production_started_at');
    expect(migration).toContain('old.created_at >= production_started_at');
    expect(migration).toContain('create or replace view public.public_campaigns');
    expect(migration).toContain('donation.created_at >= coalesce((');
    expect(migration).toContain('create or replace function public.get_production_metric_baseline()');
  });
});
