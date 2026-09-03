import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260902033000_remove_required_ngo_action_field.sql'),
  'utf8',
);

describe('simplified NGO cause onboarding migration', () => {
  it('does not require objectives to mark the public profile ready', () => {
    expect(migration).toContain("payload->>'category'");
    expect(migration).toContain("payload->>'description'");
    expect(migration).toContain("payload->>'goal'");
    expect(migration).not.toContain('jsonb_array_elements_text');
  });

  it('preserves verification, payout and payment states', () => {
    expect(migration).toContain('new.verification_status := old.verification_status');
    expect(migration).toContain('new.payout_status := old.payout_status');
    expect(migration).toContain("and old.payment_status = 'enabled'");
  });
});
