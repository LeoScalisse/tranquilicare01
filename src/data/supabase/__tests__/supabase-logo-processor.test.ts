import { describe, expect, it, vi } from 'vitest';

import { SupabaseLogoProcessor } from '@/data/supabase/supabase-logo-processor';

describe('SupabaseLogoProcessor', () => {
  it('invokes the protected edge function and returns the transparent PNG', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: new Blob(['transparent-logo'], { type: 'application/octet-stream' }),
      error: null,
      response: new Response(null, {
        headers: {
          'x-image-width': '640',
          'x-image-height': '480',
        },
      }),
    });
    const processor = new SupabaseLogoProcessor({ functions: { invoke } });
    const image = new File(['original'], 'logo-com-fundo.jpg', { type: 'image/jpeg' });

    const result = await processor.processLogo(image, '4db2b74d-81bd-4c20-ac76-0b26a757e413');

    expect(invoke).toHaveBeenCalledWith('process-organization-logo', expect.objectContaining({
      body: expect.any(FormData),
    }));
    const form = invoke.mock.calls[0][1].body as FormData;
    expect(form.get('organizationId')).toBe('4db2b74d-81bd-4c20-ac76-0b26a757e413');
    expect(form.get('image')).toMatchObject({ name: 'logo-com-fundo.jpg', type: 'image/jpeg' });
    expect(result).toMatchObject({ contentType: 'image/png', width: 640, height: 480 });
    expect(result.blob.size).toBe('transparent-logo'.length);
  });
});
