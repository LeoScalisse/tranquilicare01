import { createClient } from 'npm:@supabase/supabase-js@2.110.8';

import { createBackgroundRemovalProvider } from '../_shared/visual-media/background-removal-provider.ts';
import { visualMediaCorsHeaders, visualMediaJsonResponse } from '../_shared/visual-media/cors.ts';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN')
    ?? Deno.env.get('APP_URL')
    ?? 'http://localhost:8080';
  const allowedOrigins = (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const headers = visualMediaCorsHeaders(appOrigin, request.headers.get('Origin'), allowedOrigins);
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') {
    return visualMediaJsonResponse({ error: 'Método não permitido.' }, 405, headers);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return visualMediaJsonResponse({ error: 'Serviço temporariamente indisponível.' }, 503, headers);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return visualMediaJsonResponse({ error: 'Autenticação necessária.' }, 401, headers);
  }
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(
    authorization.slice('Bearer '.length),
  );
  if (authError || !authData.user) {
    return visualMediaJsonResponse({ error: 'Autenticação necessária.' }, 401, headers);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return visualMediaJsonResponse({ error: 'Envie uma imagem válida.' }, 400, headers);
  }
  const organizationId = String(form.get('organizationId') ?? '').trim();
  const image = form.get('image');
  if (!UUID_PATTERN.test(organizationId)) {
    return visualMediaJsonResponse({ error: 'Organização inválida.' }, 400, headers);
  }
  if (!(image instanceof File) || !IMAGE_TYPES.has(image.type) || image.size > MAX_IMAGE_BYTES) {
    return visualMediaJsonResponse({ error: 'Use uma imagem JPEG, PNG ou WEBP de até 20 MB.' }, 400, headers);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: membership, error: membershipError } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('profile_id', authData.user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'editor'])
    .maybeSingle();
  if (membershipError) {
    console.error('Logo processor membership lookup failed', { organizationId });
    return visualMediaJsonResponse({ error: 'Não foi possível validar a organização.' }, 500, headers);
  }
  if (!membership) {
    return visualMediaJsonResponse({ error: 'Você não pode alterar esta organização.' }, 403, headers);
  }

  const providerName = Deno.env.get('LOGO_BACKGROUND_REMOVAL_PROVIDER') ?? 'photoroom';
  try {
    const provider = createBackgroundRemovalProvider(providerName, {
      photoRoomApiKey: Deno.env.get('PHOTOROOM_API_KEY'),
      removeBgApiKey: Deno.env.get('REMOVE_BG_API_KEY'),
    });
    const processed = await provider.removeBackground(image);
    return new Response(processed.body, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream',
        'X-Image-Content-Type': processed.contentType,
        'X-Logo-Processor': provider.name,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Logo background removal failed', {
      organizationId,
      provider: providerName,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return visualMediaJsonResponse({ error: 'Não foi possível preparar a versão sem fundo.' }, 502, headers);
  }
});
