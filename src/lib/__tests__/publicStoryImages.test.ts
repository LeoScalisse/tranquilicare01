import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadPublicStoryImages, resetPublicStoryImageCacheForTests } from '@/lib/publicStoryImages';

describe('publicStoryImages', () => {
  afterEach(() => {
    resetPublicStoryImageCacheForTests();
    vi.unstubAllGlobals();
  });

  it('maps Openverse results with their author, license and source link', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [{
          id: 'open-image-1',
          title: 'Community garden',
          thumbnail: 'https://images.example.org/garden.jpg',
          creator: 'Ana Example',
          license: 'by',
          license_version: '4.0',
          foreign_landing_url: 'https://example.org/garden',
        }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const images = await loadPublicStoryImages();

    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      imageUrl: 'https://images.example.org/garden.jpg',
      title: 'Community garden',
      creator: 'Ana Example',
      attribution: {
        label: 'Foto: Ana Example · CC BY 4.0 · via Openverse',
        href: 'https://example.org/garden',
      },
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.openverse.org/v1/images/');
  });

  it('discards insecure media URLs and falls back to an empty list on provider errors', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [{
            id: 'unsafe',
            thumbnail: 'http://images.example.org/unsafe.jpg',
            foreign_landing_url: 'https://example.org/unsafe',
          }],
        }),
      })
      .mockRejectedValue(new Error('offline')));

    await expect(loadPublicStoryImages()).resolves.toEqual([]);
  });
});
