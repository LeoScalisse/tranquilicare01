import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260902040000_founder_code_catalog_and_feedback.sql'),
  'utf8',
);

describe('founder code catalog migration', () => {
  it('provisions exactly the three approved code hashes without plaintext codes', () => {
    expect(migration).toContain('08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3');
    expect(migration).toContain('c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8');
    expect(migration).toContain('5ed9cca6255e6e0ab7d664335bf2f7720f7e748b938d40eb37f2e7aba81666e4');
    expect(migration).not.toMatch(/TC-(CADES|MONTEAZUL|CARE)/);
    expect(migration).toContain("where code_hash not in (");
  });

  it('keeps production invitations limited and makes the CARE entry reusable', () => {
    expect(migration).toContain("'CADES', false, 1");
    expect(migration).toContain("'MONTEAZUL', false, 1");
    expect(migration).toContain("'CARE', true, 100");
    expect(migration).toContain('redemption_count + 1');
    expect(migration).toContain('redemption_count + 100');
  });

  it('returns distinct errors for every invitation state', () => {
    expect(migration).toContain('founder-code-not-found');
    expect(migration).toContain('founder-code-revoked');
    expect(migration).toContain('founder-code-expired');
    expect(migration).toContain('founder-code-already-used');
  });

  it('resolves pgcrypto without depending on the protected RPC search path', () => {
    expect(migration).toContain('private.founder_code_sha256');
    expect(migration).toContain("where installed_extension.extname = 'pgcrypto'");
    expect(migration).toContain('private.founder_code_sha256(normalized_founder_code)');
    expect(migration).not.toContain("encode(digest(normalized_founder_code");
  });

  it('does not reject a valid invitation because the profile already advanced a step', () => {
    expect(migration).not.toContain('founder_onboarding_open');
    expect(migration).not.toContain("raise exception 'founder-code-setup-only'");
  });
});
