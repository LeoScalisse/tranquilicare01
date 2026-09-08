import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260906020000_disable_donation_simulation_for_launch.sql'),
  'utf8',
);

describe('production donation simulation gate', () => {
  it('turns off the database-owned simulation flag', () => {
    expect(migration).toContain("where key = 'donation_simulation'");
    expect(migration).toContain('set enabled = false');
  });
});
