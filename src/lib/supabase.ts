/**
 * Supabase client, created only when the public project keys are present and
 * well formed.
 *
 * The app must stay usable before the backend is configured, so this exports
 * `null` instead of throwing when env vars are missing. Everything downstream
 * branches on `isSupabaseEnabled` and falls back to the local mock.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (import.meta.env.DEV && url.protocol === 'http:');
  } catch {
    return false;
  }
};

const url = clean(import.meta.env.VITE_SUPABASE_URL);
// Supabase renamed "anon key" to "publishable key" in newer dashboard copy.
const key = clean(
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const missingUrl = !url;
const missingKey = !key;
const invalidUrl = Boolean(url && !isHttpUrl(url));

export const supabaseConfigError =
  missingUrl && missingKey
    ? 'missing-env'
    : missingUrl
      ? 'missing-url'
      : missingKey
        ? 'missing-key'
        : invalidUrl
          ? 'invalid-url'
          : null;

export const isSupabaseEnabled = supabaseConfigError === null;

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Required for OAuth/PKCE redirects: reads the code from the callback
        // URL and exchanges it for a session.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

if (!isSupabaseEnabled && import.meta.env.DEV) {
  const hint = supabaseConfigError === 'missing-env'
    ? 'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para ativar.'
    : `Config Supabase invalida (${supabaseConfigError}). Confira o .env.`;
  console.info(`[TranquiliCare] Supabase desativado - rodando com login local. ${hint}`);
}
