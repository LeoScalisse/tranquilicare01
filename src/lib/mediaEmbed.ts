export type VideoProvider = "direct" | "youtube" | "instagram" | "tiktok";

export interface VideoEmbed {
  provider: VideoProvider;
  sourceUrl: string;
  embedUrl: string | null;
  posterUrl: string | null;
}

const youtubeIdFromUrl = (url: URL): string | null => {
  const hostname = url.hostname.toLowerCase();
  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) {
    return null;
  }
  return (
    url.searchParams.get("v") ||
    url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ||
    null
  );
};

export const resolveVideoEmbed = (value: string): VideoEmbed | null => {
  const sourceUrl = value.trim();
  if (!sourceUrl) return null;
  if (!sourceUrl.startsWith("/") && !/^https?:\/\//i.test(sourceUrl)) return null;

  try {
    const baseUrl = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const url = new URL(sourceUrl, baseUrl);
    const youtubeId = youtubeIdFromUrl(url);
    if (youtubeId && /^[A-Za-z0-9_-]{6,}$/.test(youtubeId)) {
      return {
        provider: "youtube",
        sourceUrl,
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
        posterUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      };
    }

    const hostname = url.hostname.toLowerCase();
    if (["youtu.be", "www.youtu.be", "youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) return null;
    if (["instagram.com", "www.instagram.com"].includes(hostname)) {
      const match = url.pathname.match(/^\/(p|reel|tv)\/([^/?]+)/);
      if (!match) return null;
      return {
        provider: "instagram",
        sourceUrl,
        embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed/`,
        posterUrl: null,
      };
    }

    if (["tiktok.com", "www.tiktok.com", "m.tiktok.com"].includes(hostname)) {
      const videoId = url.pathname.match(/\/video\/(\d+)/)?.[1];
      if (!videoId) return null;
      return {
        provider: "tiktok",
        sourceUrl,
        embedUrl: `https://www.tiktok.com/player/v1/${videoId}`,
        posterUrl: null,
      };
    }

    if (["http:", "https:"].includes(url.protocol) || sourceUrl.startsWith("/")) {
      return {
        provider: "direct",
        sourceUrl,
        embedUrl: null,
        posterUrl: null,
      };
    }
  } catch {
    return null;
  }
  return null;
};

export const isValidVideoUrl = (value: string): boolean =>
  !value.trim() || resolveVideoEmbed(value) !== null;

export const getVideoProviderLabel = (provider: VideoProvider): string =>
  ({
    direct: "Vídeo",
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
  })[provider];
