import { Play } from "lucide-react";

import { getVideoProviderLabel, resolveVideoEmbed } from "@/lib/mediaEmbed";
import { cn } from "@/lib/utils";

interface EmbeddedVideoProps {
  src: string;
  title: string;
  poster?: string;
  autoplay?: boolean;
  className?: string;
}

export const EmbeddedVideo = ({
  src,
  title,
  poster,
  autoplay = false,
  className,
}: EmbeddedVideoProps) => {
  const media = resolveVideoEmbed(src);

  if (!media) {
    return (
      <div className={cn("grid h-full w-full place-items-center bg-brand-ink text-sm font-semibold text-white", className)}>
        Vídeo indisponível
      </div>
    );
  }

  if (media.provider === "direct") {
    return (
      <video
        src={media.sourceUrl}
        poster={poster}
        controls
        autoPlay={autoplay}
        playsInline
        preload="metadata"
        className={cn("h-full w-full object-contain", className)}
      />
    );
  }

  return (
    <iframe
      src={`${media.embedUrl}${media.provider === "youtube" && autoplay ? "&autoplay=1" : ""}`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
      className={cn("h-full w-full border-0", className)}
    />
  );
};

interface VideoPreviewProps {
  src: string;
  title: string;
  poster?: string;
  className?: string;
}

export const VideoPreview = ({ src, title, poster, className }: VideoPreviewProps) => {
  const media = resolveVideoEmbed(src);
  const previewPoster = poster || media?.posterUrl || undefined;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-brand-ink", className)}>
      {media?.provider === "direct" ? (
        <video src={src} poster={previewPoster} muted loop autoPlay playsInline preload="metadata" className="h-full w-full object-cover" aria-hidden="true" />
      ) : previewPoster ? (
        <img src={previewPoster} alt="" className="h-full w-full object-cover" aria-hidden="true" />
      ) : (
        <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_80%_10%,rgba(255,222,89,.42),transparent_30%),linear-gradient(145deg,#38b6ff,#106fa4)] text-white">
          <span className="text-xs font-bold uppercase tracking-[0.16em]">
            {media ? getVideoProviderLabel(media.provider) : "Vídeo"}
          </span>
        </div>
      )}
      <span className="absolute inset-0 bg-black/15" aria-hidden="true" />
      <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
        <span className="grid size-12 place-items-center rounded-full bg-white/95 text-brand-blue shadow-lg">
          <Play className="size-5 fill-current" />
        </span>
      </span>
      <span className="sr-only">{title}</span>
    </div>
  );
};

export default EmbeddedVideo;
