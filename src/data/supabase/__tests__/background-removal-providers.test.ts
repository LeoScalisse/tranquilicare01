import { describe, expect, it, vi } from 'vitest';

import {
  PhotoRoomBackgroundRemovalProvider,
  RemoveBgBackgroundRemovalProvider,
} from '../../../../supabase/functions/_shared/visual-media/background-removal-provider';

describe('background removal providers', () => {
  it('sends logos to PhotoRoom using its server-side API contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(['png'], { type: 'image/png' }), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));
    const provider = new PhotoRoomBackgroundRemovalProvider('photo-secret', fetchMock);
    const image = new File(['logo'], 'logo.jpg', { type: 'image/jpeg' });

    const result = await provider.removeBackground(image);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://sdk.photoroom.com/v1/segment',
      expect.objectContaining({ method: 'POST', headers: { 'x-api-key': 'photo-secret' } }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect((request.body as FormData).get('image_file')).toMatchObject({ name: 'logo.jpg', type: 'image/jpeg' });
    expect(result.contentType).toBe('image/png');
    expect(result.body.byteLength).toBeGreaterThan(0);
  });

  it('keeps remove.bg available behind the same provider-neutral boundary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(['png'], { type: 'image/png' }), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));
    const provider = new RemoveBgBackgroundRemovalProvider('remove-secret', fetchMock);
    const image = new File(['logo'], 'logo.png', { type: 'image/png' });

    await provider.removeBackground(image);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.remove.bg/v1.0/removebg',
      expect.objectContaining({ method: 'POST', headers: { 'X-Api-Key': 'remove-secret' } }),
    );
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('image_file')).toMatchObject({ name: 'logo.png', type: 'image/png' });
    expect(form.get('type')).toBe('graphic');
    expect(form.get('format')).toBe('png');
  });
});
