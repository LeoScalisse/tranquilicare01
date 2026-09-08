export type StorySocialProvider = 'instagram' | 'tiktok' | 'threads' | 'substack';

export interface StorySocialEmbed {
  provider: StorySocialProvider;
  sourceUrl: string;
  embedUrl: string | null;
  label: string;
}

const HOSTS: Record<StorySocialProvider, Set<string>> = {
  instagram: new Set(['instagram.com', 'www.instagram.com']),
  tiktok: new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']),
  threads: new Set(['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com']),
  substack: new Set(['substack.com', 'www.substack.com']),
};

const isSubstackPublication = (hostname: string) => hostname.endsWith('.substack.com');

export const resolveStorySocialEmbed = (value: string): StorySocialEmbed | null => {
  const candidate = value.trim();
  if (!candidate || !/^https:\/\//i.test(candidate)) return null;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    url.hash = '';

    if (HOSTS.instagram.has(hostname)) {
      const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (!match) return null;
      const sourceUrl = `https://www.instagram.com/${match[1]}/${match[2]}/`;
      return { provider: 'instagram', sourceUrl, embedUrl: `${sourceUrl}embed/`, label: 'Instagram' };
    }

    if (HOSTS.tiktok.has(hostname)) {
      const videoId = url.pathname.match(/\/video\/(\d+)/)?.[1];
      if (!videoId) return null;
      return { provider: 'tiktok', sourceUrl: url.toString(), embedUrl: `https://www.tiktok.com/player/v1/${videoId}`, label: 'TikTok' };
    }

    if (HOSTS.threads.has(hostname)) {
      const match = url.pathname.match(/^\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/);
      if (!match) return null;
      const sourceUrl = `https://www.threads.net/@${match[1]}/post/${match[2]}`;
      return { provider: 'threads', sourceUrl, embedUrl: null, label: 'Threads' };
    }

    if (HOSTS.substack.has(hostname) || isSubstackPublication(hostname)) {
      const isPost = /^\/(?:@[^/]+\/)?p\/[A-Za-z0-9_-]+/.test(url.pathname);
      const isNote = /^\/@[^/]+\/note\/c-[A-Za-z0-9_-]+/.test(url.pathname) || /^\/note\/c-[A-Za-z0-9_-]+/.test(url.pathname);
      if (!isPost && !isNote) return null;
      return { provider: 'substack', sourceUrl: url.toString(), embedUrl: null, label: 'Substack' };
    }
  } catch {
    return null;
  }
  return null;
};

export const storySocialUrlError = (value: string) => {
  if (!value.trim()) return '';
  return resolveStorySocialEmbed(value)
    ? ''
    : 'Cole o link público de uma publicação do Instagram, TikTok, Threads ou Substack.';
};
