import { afterEach, describe, expect, it } from 'vitest';
import { setStoryLiked } from '@/lib/stories';

describe('local story likes', () => {
  afterEach(() => window.localStorage.removeItem('tc-story-likes'));

  it('persists likes for curated stories that do not have a database UUID', async () => {
    await setStoryLiked('tranquilicare-local-story-1', true);
    expect(JSON.parse(window.localStorage.getItem('tc-story-likes') ?? '[]')).toContain('tranquilicare-local-story-1');

    await setStoryLiked('tranquilicare-local-story-1', false);
    expect(JSON.parse(window.localStorage.getItem('tc-story-likes') ?? '[]')).not.toContain('tranquilicare-local-story-1');
  });
});
