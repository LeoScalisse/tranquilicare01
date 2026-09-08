import { describe, expect, it } from 'vitest';

import { resolveStorySocialEmbed, storySocialUrlError } from '@/lib/storySocialEmbed';

describe('story social embeds', () => {
  it('normalizes supported public post URLs', () => {
    expect(resolveStorySocialEmbed('https://www.instagram.com/p/ABC_123/?utm_source=x')).toMatchObject({
      provider: 'instagram',
      embedUrl: 'https://www.instagram.com/p/ABC_123/embed/',
    });
    expect(resolveStorySocialEmbed('https://www.tiktok.com/@creator/video/7481234567890')).toMatchObject({
      provider: 'tiktok',
      embedUrl: 'https://www.tiktok.com/player/v1/7481234567890',
    });
    expect(resolveStorySocialEmbed('https://www.threads.com/@creator/post/DEF-456')).toMatchObject({
      provider: 'threads',
      sourceUrl: 'https://www.threads.net/@creator/post/DEF-456',
    });
    expect(resolveStorySocialEmbed('https://creator.substack.com/p/a-publicacao')).toMatchObject({
      provider: 'substack',
    });
  });

  it('rejects insecure, unsupported and profile-only URLs with a useful error', () => {
    expect(resolveStorySocialEmbed('javascript:alert(1)')).toBeNull();
    expect(resolveStorySocialEmbed('http://instagram.com/p/ABC')).toBeNull();
    expect(resolveStorySocialEmbed('https://example.com/post/ABC')).toBeNull();
    expect(resolveStorySocialEmbed('https://instagram.com/creator')).toBeNull();
    expect(storySocialUrlError('https://example.com/post/ABC')).toContain('Instagram, TikTok, Threads ou Substack');
  });
});
