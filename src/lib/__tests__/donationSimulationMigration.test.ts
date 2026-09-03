import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260902023000_temporary_persisted_donation_simulation.sql'),
  'utf8',
);

describe('temporary persisted donation simulation migration', () => {
  it('requires an authenticated donor and a server-side feature flag', () => {
    expect(migration).toContain("flag.key = 'donation_simulation'");
    expect(migration).toContain("profile.account_type = 'donor'::public.account_type");
    expect(migration).toContain("raise exception 'donor-account-required'");
    expect(migration).toContain("grant execute on function public.create_simulated_donation(uuid, integer) to authenticated");
    expect(migration).not.toContain("create_simulated_donation(uuid, integer) to anon");
  });

  it('marks test rows and excludes them from public impact totals', () => {
    expect(migration).toContain('new.status = \'succeeded\' and not new.is_test');
    expect(migration).toContain("'simulation',");
    expect(migration).toContain('and not donation.is_test');
    expect(migration).toContain('is_test = excluded.is_test');
  });
});
