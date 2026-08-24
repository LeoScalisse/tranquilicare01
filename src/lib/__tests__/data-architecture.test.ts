import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
  const path = resolve(directory, entry);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(ts|tsx)$/.test(entry) && !path.includes(`${resolve('src', 'lib', '__tests__')}`)
    ? [path]
    : [];
});

describe('data architecture boundaries', () => {
  it('keeps Supabase Storage calls inside its adapter', () => {
    expect(read('src/lib/profileMedia.ts')).not.toContain('supabase.storage');
    expect(read('src/data/supabase/supabase-media-storage.ts')).toContain('.storage');
    expect(read('src/domain/media/media-storage.ts')).not.toContain('SupabaseClient');
  });

  it('never exposes service-role configuration in frontend source', () => {
    const frontend = sourceFiles(resolve(process.cwd(), 'src'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    expect(frontend).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  });

  it('records provider-neutral media and idempotent payment constraints', () => {
    const migration = read('supabase/migrations/20260822011941_domain_data_architecture.sql');
    const paymentMigration = read('supabase/migrations/20260821000100_provider_agnostic_payments.sql');
    expect(migration).toContain('create table if not exists public.media_assets');
    expect(migration).toContain('provider text not null');
    expect(migration).toContain('storage_key text');
    expect(paymentMigration).toContain('unique (provider, provider_event_id)');
  });

  it('keeps draft story media private and binds media to the story organization', () => {
    const hardening = read('supabase/migrations/20260822023000_security_hardening.sql');
    expect(hardening).toContain("alter column visibility set default 'private'");
    expect(hardening).toContain("set public = false");
    expect(hardening).toContain('stories_media_select_published_or_member');
    expect(hardening).toContain('validate_story_media_organization');
    expect(hardening).toContain("story.status = 'published'");
  });

  it('authorizes payment details before contacting the provider', () => {
    const handler = read('supabase/functions/_shared/payments/http/confirm-payment-handler.ts');
    expect(handler).toContain('authorizePaymentConfirmation');
    expect(handler).toContain('confirmation_token_hash');
    expect(handler.indexOf('await authorizePaymentConfirmation')).toBeLessThan(
      handler.indexOf('const runtime = createPaymentRuntime()'),
    );
  });
});
