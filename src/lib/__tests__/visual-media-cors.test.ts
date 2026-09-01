import { describe, expect, it } from 'vitest';

import { visualMediaCorsHeaders } from '../../../supabase/functions/_shared/visual-media/cors';

describe('visual media Edge Function CORS', () => {
  it('falls back to the configured application for an untrusted origin', () => {
    const headers = visualMediaCorsHeaders(
      'https://tranquilicare.app',
      'https://attacker.example',
    );

    expect(headers['Access-Control-Allow-Origin']).toBe('https://tranquilicare.app');
  });

  it('accepts an exact additional origin without wildcard matching', () => {
    const preview = 'https://preview.tranquilicare.app';
    const headers = visualMediaCorsHeaders(
      'https://tranquilicare.app',
      preview,
      [preview],
    );

    expect(headers['Access-Control-Allow-Origin']).toBe(preview);
  });
});
