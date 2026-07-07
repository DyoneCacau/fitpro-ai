import { getVideoEmbed } from "@/lib/video-embed";

export function ExerciseVideoPlayer({ url, title }: { url: string; title?: string }) {
  const video = getVideoEmbed(url);

  if (video.kind === "youtube" || video.kind === "vimeo") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={video.embedUrl}
          title={title ?? "Vídeo de execução"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (video.kind === "file") {
    return (
      <video
        src={video.src}
        controls
        playsInline
        className="aspect-video w-full rounded-xl border border-border bg-black"
      >
        <track kind="captions" />
      </video>
    );
  }

  if (video.kind === "external") {
    return (
      <a
        href={video.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold text-primary text-center"
      >
        Abrir vídeo de execução
      </a>
    );
  }

  return null;
}
