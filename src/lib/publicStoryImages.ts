import type { StoryAttribution } from '@/types/storyPresentation';

export interface PublicStoryImage {
  id: string;
  imageUrl: string;
  title: string;
  creator: string;
  attribution: StoryAttribution;
}

interface OpenverseImageResult {
  id?: unknown;
  title?: unknown;
  thumbnail?: unknown;
  creator?: unknown;
  license?: unknown;
  license_version?: unknown;
  foreign_landing_url?: unknown;
}

interface StoryImageProvider {
  search(query: string, limit: number): Promise<PublicStoryImage[]>;
}

const OPENVERSE_ENDPOINT = 'https://api.openverse.org/v1/images/';
const REQUEST_TIMEOUT_MS = 6_000;
const safeText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const safeHttpsUrl = (value: unknown): string | null => {
  const candidate = safeText(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const licenseLabel = (license: unknown, version: unknown) => {
  const name = safeText(license).toUpperCase();
  const number = safeText(version);
  const family = name === 'CC0'
    ? 'CC0'
    : name === 'PDM'
      ? 'Domínio público'
      : name
        ? `CC ${name}`
        : '';
  return [family, number].filter(Boolean).join(' ');
};

class OpenverseStoryImageProvider implements StoryImageProvider {
  async search(query: string, limit: number): Promise<PublicStoryImage[]> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const endpoint = new URL(OPENVERSE_ENDPOINT);
    endpoint.searchParams.set('q', query);
    endpoint.searchParams.set('page_size', String(Math.max(1, Math.min(limit * 3, 20))));

    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) return [];
      const payload = await response.json() as { results?: OpenverseImageResult[] };
      if (!Array.isArray(payload.results)) return [];

      return payload.results.flatMap((result): PublicStoryImage[] => {
        const id = safeText(result.id);
        const imageUrl = safeHttpsUrl(result.thumbnail);
        const landingUrl = safeHttpsUrl(result.foreign_landing_url);
        if (!id || !imageUrl || !landingUrl) return [];
        const creator = safeText(result.creator) || 'Autor não informado';
        const license = licenseLabel(result.license, result.license_version);
        return [{
          id,
          imageUrl,
          title: safeText(result.title) || 'Imagem do acervo aberto',
          creator,
          attribution: {
            label: `Foto: ${creator}${license ? ` · ${license}` : ''} · via Openverse`,
            href: landingUrl,
          },
        }];
      }).slice(0, limit);
    } catch {
      return [];
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}

const publicStoryQueries = [
  'nonprofit community volunteers',
  'community education volunteers',
  'animal shelter volunteers',
  'environmental restoration volunteers',
] as const;

let cachedPublicStoryImages: Promise<PublicStoryImage[]> | null = null;

export const loadPublicStoryImages = () => {
  if (cachedPublicStoryImages) return cachedPublicStoryImages;
  const provider = new OpenverseStoryImageProvider();
  cachedPublicStoryImages = Promise.all(publicStoryQueries.map((query) => provider.search(query, 1)))
    .then((groups) => {
      const seen = new Set<string>();
      return groups.flat().filter((image) => {
        if (seen.has(image.id)) return false;
        seen.add(image.id);
        return true;
      });
    })
    .catch(() => []);
  return cachedPublicStoryImages;
};

export const resetPublicStoryImageCacheForTests = () => {
  cachedPublicStoryImages = null;
};
