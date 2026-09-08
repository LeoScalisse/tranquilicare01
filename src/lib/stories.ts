import { supabase } from '@/lib/supabase';
import { resolveStorySocialEmbed, type StorySocialProvider } from '@/lib/storySocialEmbed';

const STORY_BUCKET = 'stories-public';
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_EDGE = 2048;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PublishedStory {
  id: string;
  url: string;
  type: 'image' | 'video' | StorySocialProvider;
  caption: string;
  timestamp: number;
  ngoId: string | null;
  authorProfileId: string | null;
  ngoName: string;
  ngoImage: string;
  isFounder: boolean;
  persisted: true;
}

export interface StoryViewerState {
  currentProfileId: string | null;
  savedStoryIds: Set<string>;
  likedStoryIds: Set<string>;
  reportedStoryIds: Set<string>;
  followedOrganizationIds: Set<string>;
}

interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

interface PublicStoryAuthor {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

const emptyViewerState = (): StoryViewerState => ({
  currentProfileId: null,
  savedStoryIds: new Set(),
  likedStoryIds: new Set(),
  reportedStoryIds: new Set(),
  followedOrganizationIds: new Set(),
});

export const isPersistedStoryId = (storyId: string) => UUID_PATTERN.test(storyId);

const readImage = (blob: Blob): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };
  image.src = objectUrl;
});

const encodeWebp = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('image-encoding-failed')),
    'image/webp',
    0.88,
  );
});

const prepareStoryImage = async (file: File): Promise<PreparedImage> => {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error('unsupported-image');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('image-too-large');

  const image = await readImage(file);
  const scale = Math.min(1, MAX_OUTPUT_EDGE / image.naturalWidth, MAX_OUTPUT_EDGE / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas-unavailable');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return { blob: await encodeWebp(canvas), width, height };
};

const requireIdentity = async () => {
  if (!supabase) throw new Error('backend-unavailable');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('auth-required');
  return data.user;
};

const resolvePublishingOrganization = async (profileId: string) => {
  if (!supabase) throw new Error('backend-unavailable');
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'editor'])
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.organization_id as string | undefined) ?? null;
};

const signedMediaUrl = async (asset: {
  bucket: string | null;
  storage_key: string | null;
  external_url: string | null;
}) => {
  if (supabase && asset.bucket && asset.storage_key) {
    const { data } = await supabase.storage.from(asset.bucket).createSignedUrl(asset.storage_key, 60 * 60);
    if (data?.signedUrl) return data.signedUrl;
  }
  return asset.external_url ?? '';
};

export const loadPublishedStories = async (): Promise<PublishedStory[]> => {
  if (!supabase) return [];

  const { data: storyRows, error: storyError } = await supabase
    .from('stories')
    .select('id, organization_id, author_profile_id, body, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(60);
  if (storyError) throw storyError;
  if (!storyRows?.length) return [];

  const storyIds = storyRows.map((story) => story.id as string);
  const organizationIds = [...new Set(storyRows.map((story) => story.organization_id as string | null).filter((id): id is string => Boolean(id)))];
  const authorIds = [...new Set(storyRows
    .filter((story) => !story.organization_id)
    .map((story) => story.author_profile_id as string | null)
    .filter((id): id is string => Boolean(id)))];
  const organizationRequest = organizationIds.length
    ? supabase.from('public_organizations').select('id, name, avatar_url, cover_image_url, is_founder').in('id', organizationIds)
    : Promise.resolve({ data: [], error: null });
  const authorRequest = authorIds.length
    ? supabase.rpc('get_public_story_authors', { requested_profile_ids: authorIds })
    : Promise.resolve({ data: [], error: null });
  const [{ data: organizations, error: organizationError }, { data: authors, error: authorError }, { data: mediaLinks, error: linkError }] = await Promise.all([
    organizationRequest,
    authorRequest,
    supabase
      .from('story_media')
      .select('story_id, media_asset_id, sort_order')
      .in('story_id', storyIds)
      .order('sort_order', { ascending: true }),
  ]);
  if (organizationError) throw organizationError;
  if (authorError) throw authorError;
  if (linkError) throw linkError;

  const mediaIds = [...new Set((mediaLinks ?? []).map((link) => link.media_asset_id as string))];
  const mediaAssets = mediaIds.length
    ? await supabase
        .from('media_assets')
        .select('id, bucket, storage_key, external_url, media_type, provider')
        .in('id', mediaIds)
    : { data: [], error: null };
  if (mediaAssets.error) throw mediaAssets.error;

  const organizationById = new Map((organizations ?? []).map((organization) => [organization.id as string, organization]));
  const authorById = new Map<string, PublicStoryAuthor>(
    ((authors ?? []) as PublicStoryAuthor[]).map((author) => [author.id, author]),
  );
  const assetById = new Map((mediaAssets.data ?? []).map((asset) => [asset.id as string, asset]));
  const firstAssetByStory = new Map<string, (typeof mediaAssets.data)[number]>();
  for (const link of mediaLinks ?? []) {
    const storyId = link.story_id as string;
    if (firstAssetByStory.has(storyId)) continue;
    const asset = assetById.get(link.media_asset_id as string);
    if (asset) firstAssetByStory.set(storyId, asset);
  }

  return Promise.all(storyRows.flatMap((story) => {
    const organizationId = story.organization_id as string | null;
    const organization = organizationId ? organizationById.get(organizationId) : null;
    const author = story.author_profile_id ? authorById.get(story.author_profile_id as string) : null;
    if (!organization && !author) return [];
    const asset = firstAssetByStory.get(story.id as string);
    return [Promise.resolve(asset ? signedMediaUrl(asset) : organization?.cover_image_url || organization?.avatar_url || author?.avatar_url || '')
      .then((url): PublishedStory => ({
        id: story.id as string,
        url: url || '/images/tranquilicare-heart-transparent.png',
        type: asset?.media_type === 'video' ? 'video' : asset?.media_type === 'document' && ['instagram', 'tiktok', 'threads', 'substack'].includes(String(asset.provider)) ? asset.provider as StorySocialProvider : 'image',
        caption: String(story.body ?? '').trim(),
        timestamp: new Date(story.published_at as string).getTime(),
        ngoId: organizationId,
        authorProfileId: story.author_profile_id as string | null,
        ngoName: String(organization?.name ?? author?.name ?? 'Pessoa apoiadora'),
        ngoImage: String(organization?.avatar_url || author?.avatar_url || '/images/tranquilicare-heart-transparent.png'),
        isFounder: organization?.is_founder === true,
        persisted: true,
      }))];
  }));
};

/** Loads the authenticated organization's own published media, including while
 * its public profile is still awaiting verification. */
export const loadOwnOrganizationPublishedStories = async (
  organizationId: string,
  organization: { name: string; avatarUrl: string; isFounder: boolean },
): Promise<PublishedStory[]> => {
  if (!supabase) return [];
  const identity = await requireIdentity();
  const ownedOrganizationId = await resolvePublishingOrganization(identity.id);
  if (ownedOrganizationId !== organizationId) throw new Error('organization-access-denied');

  const { data: storyRows, error: storyError } = await supabase
    .from('stories')
    .select('id, body, published_at')
    .eq('organization_id', organizationId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(60);
  if (storyError) throw storyError;
  if (!storyRows?.length) return [];

  const storyIds = storyRows.map((story) => story.id as string);
  const { data: mediaLinks, error: linkError } = await supabase
    .from('story_media')
    .select('story_id, media_asset_id, sort_order')
    .in('story_id', storyIds)
    .order('sort_order', { ascending: true });
  if (linkError) throw linkError;

  const mediaIds = [...new Set((mediaLinks ?? []).map((link) => link.media_asset_id as string))];
  const mediaAssets = mediaIds.length
    ? await supabase
        .from('media_assets')
        .select('id, bucket, storage_key, external_url, media_type, provider')
        .in('id', mediaIds)
    : { data: [], error: null };
  if (mediaAssets.error) throw mediaAssets.error;

  const assetById = new Map((mediaAssets.data ?? []).map((asset) => [asset.id as string, asset]));
  const firstAssetByStory = new Map<string, (typeof mediaAssets.data)[number]>();
  for (const link of mediaLinks ?? []) {
    const storyId = link.story_id as string;
    if (firstAssetByStory.has(storyId)) continue;
    const asset = assetById.get(link.media_asset_id as string);
    if (asset) firstAssetByStory.set(storyId, asset);
  }

  return Promise.all(storyRows.map(async (story): Promise<PublishedStory> => {
    const asset = firstAssetByStory.get(story.id as string);
    const url = asset ? await signedMediaUrl(asset) : organization.avatarUrl;
    return {
      id: story.id as string,
      url: url || '/images/tranquilicare-heart-transparent.png',
      type: asset?.media_type === 'video' ? 'video' : asset?.media_type === 'document' && ['instagram', 'tiktok', 'threads', 'substack'].includes(String(asset.provider)) ? asset.provider as StorySocialProvider : 'image',
      caption: String(story.body ?? '').trim(),
      timestamp: new Date(story.published_at as string).getTime(),
      ngoId: organizationId,
      authorProfileId: identity.id,
      ngoName: organization.name,
      ngoImage: organization.avatarUrl || '/images/tranquilicare-heart-transparent.png',
      isFounder: organization.isFounder,
      persisted: true,
    };
  }));
};

export const loadStoryViewerState = async (): Promise<StoryViewerState> => {
  if (!supabase) return emptyViewerState();
  const { data: identity } = await supabase.auth.getUser();
  if (!identity.user) return emptyViewerState();

  const [saves, likes, reports, follows] = await Promise.all([
    supabase.from('story_saves').select('story_id').eq('profile_id', identity.user.id),
    supabase.from('story_likes').select('story_id').eq('profile_id', identity.user.id),
    supabase.from('story_reports').select('story_id').eq('reporter_profile_id', identity.user.id),
    supabase.from('organization_follows').select('organization_id').eq('profile_id', identity.user.id),
  ]);

  return {
    currentProfileId: identity.user.id,
    savedStoryIds: new Set((saves.data ?? []).map((row) => row.story_id as string)),
    likedStoryIds: new Set((likes.data ?? []).map((row) => row.story_id as string)),
    reportedStoryIds: new Set((reports.data ?? []).map((row) => row.story_id as string)),
    followedOrganizationIds: new Set((follows.data ?? []).map((row) => row.organization_id as string)),
  };
};

export const publishStory = async (body: string, imageFile: File | null, socialUrl: string | null = null) => {
  if (!supabase) throw new Error('backend-unavailable');
  const content = body.trim();
  if (!content) throw new Error('story-empty');
  if (content.length > 5000) throw new Error('story-too-long');
  const socialEmbed = socialUrl ? resolveStorySocialEmbed(socialUrl) : null;
  if (socialUrl && !socialEmbed) throw new Error('invalid-social-url');
  if (imageFile && socialEmbed) throw new Error('story-media-conflict');

  const identity = await requireIdentity();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', identity.id)
    .single();
  if (profileError) throw profileError;
  const organizationId = profile.account_type === 'ngo'
    ? await resolvePublishingOrganization(identity.id)
    : null;
  if (profile.account_type === 'ngo' && !organizationId) throw new Error('publisher-not-ready');
  const storyId = globalThis.crypto.randomUUID();
  const { error: draftError } = await supabase.from('stories').insert({
    id: storyId,
    organization_id: organizationId,
    author_profile_id: identity.id,
    body: content,
    title: '',
    status: 'draft',
  });
  if (draftError) throw draftError;

  let storageKey: string | null = null;
  let mediaAssetId: string | null = null;
  try {
    if (imageFile) {
      const prepared = await prepareStoryImage(imageFile);
      storageKey = `${organizationId ?? identity.id}/${storyId}/${globalThis.crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from(STORY_BUCKET).upload(storageKey, prepared.blob, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: mediaAsset, error: mediaError } = await supabase
        .from('media_assets')
        .insert({
          owner_profile_id: identity.id,
          organization_id: organizationId,
          purpose: 'story',
          provider: 'supabase',
          bucket: STORY_BUCKET,
          storage_key: storageKey,
          media_type: 'image',
          visibility: 'private',
          mime_type: 'image/webp',
          width: prepared.width,
          height: prepared.height,
          file_size_bytes: prepared.blob.size,
          metadata: { source: 'story-composer', originalName: imageFile.name },
        })
        .select('id')
        .single();
      if (mediaError) throw mediaError;
      mediaAssetId = mediaAsset.id as string;
    } else if (socialEmbed) {
      const { data: mediaAsset, error: mediaError } = await supabase
        .from('media_assets')
        .insert({
          owner_profile_id: identity.id,
          organization_id: organizationId,
          purpose: 'story',
          provider: socialEmbed.provider,
          external_url: socialEmbed.sourceUrl,
          media_type: 'document',
          visibility: 'private',
          metadata: { source: 'story-composer', embedProvider: socialEmbed.provider },
        })
        .select('id')
        .single();
      if (mediaError) throw mediaError;
      mediaAssetId = mediaAsset.id as string;
    }

    if (mediaAssetId) {
      const { error: linkError } = await supabase.from('story_media').insert({
        story_id: storyId,
        media_asset_id: mediaAssetId,
        sort_order: 0,
      });
      if (linkError) throw linkError;
    }

    const { data: publishedStory, error: publishError } = await supabase
      .from('stories')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', storyId)
      .select('id, status, published_at')
      .single();
    if (publishError) throw publishError;
    if (!publishedStory || publishedStory.id !== storyId || publishedStory.status !== 'published' || !publishedStory.published_at) {
      throw new Error('story-not-persisted');
    }
    return storyId;
  } catch (error) {
    await supabase.from('story_media').delete().eq('story_id', storyId);
    if (mediaAssetId) await supabase.from('media_assets').delete().eq('id', mediaAssetId);
    if (storageKey) await supabase.storage.from(STORY_BUCKET).remove([storageKey]);
    await supabase.from('stories').update({ status: 'archived' }).eq('id', storyId);
    throw error;
  }
};

export const setStorySaved = async (storyId: string, saved: boolean) => {
  if (!supabase || !isPersistedStoryId(storyId)) return;
  const identity = await requireIdentity();
  const operation = saved
    ? supabase.from('story_saves').insert({ profile_id: identity.id, story_id: storyId })
    : supabase.from('story_saves').delete().eq('profile_id', identity.id).eq('story_id', storyId);
  const { error } = await operation;
  if (error && error.code !== '23505') throw error;
};

export const setStoryLiked = async (storyId: string, liked: boolean) => {
  if (!supabase || !isPersistedStoryId(storyId)) return;
  await requireIdentity();
  const { error } = await supabase.rpc('set_story_like', {
    target_story_id: storyId,
    should_like: liked,
  });
  if (error) throw error;
};
export const reportStory = async (storyId: string, reason: string) => {
  if (!supabase || !isPersistedStoryId(storyId)) return;
  const identity = await requireIdentity();
  const { error } = await supabase.from('story_reports').insert({
    story_id: storyId,
    reporter_profile_id: identity.id,
    reason: reason.trim(),
  });
  if (error && error.code !== '23505') throw error;
};

export const storyErrorMessage = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  if (code === 'unsupported-image') return 'Use uma imagem JPEG, PNG ou WEBP.';
  if (code === 'image-too-large') return 'A imagem original pode ter até 20 MB.';
  if (code === 'invalid-image') return 'Não foi possível ler essa imagem.';
  if (code === 'story-empty') return 'Escreva algo antes de publicar.';
  if (code === 'invalid-social-url') return 'Cole um link público válido do Instagram, TikTok, Threads ou Substack.';
  if (code === 'story-media-conflict') return 'Escolha uma foto ou uma publicação externa por história.';
  if (code === 'story-too-long') return 'A história pode ter até 5.000 caracteres.';
  if (code === 'publisher-not-ready') return 'Este acesso ainda não está pronto para publicar histórias.';
  if (code === 'story-not-persisted') return 'A publicação não foi confirmada pelo banco. Tente novamente.';
  if (code === 'auth-required') return 'Entre novamente para continuar.';
  if (code === 'backend-unavailable') return 'Conecte o projeto ao Supabase para publicar histórias reais.';
  return 'Não foi possível publicar a história. Tente novamente.';
};

export const deleteOwnStory = async (storyId: string): Promise<void> => {
  if (!supabase || !isPersistedStoryId(storyId)) throw new Error('story-not-persisted');
  await requireIdentity();

  const { data: links, error: linkReadError } = await supabase
    .from('story_media')
    .select('media_asset_id')
    .eq('story_id', storyId);
  if (linkReadError) throw linkReadError;

  const mediaIds = (links ?? []).map((link) => link.media_asset_id as string);
  const assets = mediaIds.length
    ? await supabase.from('media_assets').select('id, bucket, storage_key').in('id', mediaIds)
    : { data: [], error: null };
  if (assets.error) throw assets.error;

  const { error: deleteError } = await supabase.from('stories').delete().eq('id', storyId);
  if (deleteError) throw deleteError;

  if (mediaIds.length) {
    await Promise.resolve(supabase.from('media_assets').delete().in('id', mediaIds)).catch(() => undefined);
  }
  const storageGroups = new Map<string, string[]>();
  for (const asset of assets.data ?? []) {
    if (!asset.bucket || !asset.storage_key) continue;
    storageGroups.set(asset.bucket, [...(storageGroups.get(asset.bucket) ?? []), asset.storage_key]);
  }
  await Promise.allSettled([...storageGroups].map(([bucket, keys]) => supabase.storage.from(bucket).remove(keys)));
};