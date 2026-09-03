import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260902010000_restore_founder_codes_and_public_ready_ngos.sql'),
  'utf8',
);

describe('NGO launch migration', () => {
  it('stores only invitation hashes and restores atomic founder redemption', () => {
    expect(migration).toContain('08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3');
    expect(migration).toContain('c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8');
    expect(migration).toContain("regexp_replace(coalesce(founder_invitation_code, ''), '[^A-Za-z0-9]', '', 'g')");
    expect(migration).toContain('for update;');
    expect(migration).toContain('redemption_count = redemption_count + 1');
    expect(migration).not.toContain('founder_code_plaintext');
  });

  it('keeps discovery, verification and donations as separate decisions', () => {
    expect(migration).toContain('organization_profile_is_public');
    expect(migration).toContain("ngo.profile_status = 'ready'");
    expect(migration).toContain('organization_can_receive_donations');
    expect(migration).toContain("ngo.verification_status = 'verified'");
    expect(migration).toContain("ngo.payout_status = 'configured'");
    expect(migration).toContain("ngo.payment_status = 'enabled'");
  });
});
