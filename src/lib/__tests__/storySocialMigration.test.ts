import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260907010000_story_social_embeds_and_likes.sql'),
  'utf8',
);

describe('story social and likes migration', () => {
  it('validates social URLs in the database and never accepts arbitrary providers', () => {
    expect(migration).toContain('private.validate_story_social_media');
    expect(migration).toContain("new.provider not in ('instagram', 'tiktok', 'threads', 'substack')");
    expect(migration).toContain("normalized_url !~ '^https://'");
    expect(migration).toContain('media_assets_validate_story_social');
  });

  it('stores one like per profile with private RLS and public aggregate counts', () => {
    expect(migration).toContain('create table if not exists public.story_likes');
    expect(migration).toContain('primary key (profile_id, story_id)');
    expect(migration).toContain('alter table public.story_likes enable row level security');
    expect(migration).toContain('profile_id = (select auth.uid())');
    expect(migration).toContain('security definer');
    expect(migration).toContain('get_story_like_counts');
  });
});
