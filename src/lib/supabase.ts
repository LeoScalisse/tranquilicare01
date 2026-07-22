/**
 * Supabase client — created only when the project keys are present.
 *
 * The app must stay fully usable before the backend is configured, so this
 * exports `null` instead of throwing when the env vars are missing. Everything
 * downstream branches on `isSupabaseEnabled` and falls back to the local mock
 * (see `authLocal.ts`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
// Supabase renamed "anon key" to "publishable key" in the new dashboard —
// accept either so the .env keeps working whichever name you copied.
const key = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)?.trim();

export const isSupabaseEnabled = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Required for the Google redirect: reads the code out of the URL on
        // return and exchanges it for a session.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

if (!isSupabaseEnabled && import.meta.env.DEV) {
  console.info(
    '[TranquiliCare] Supabase não configurado — rodando com o login local (mock). ' +
      'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para ativar.',
  );
}
