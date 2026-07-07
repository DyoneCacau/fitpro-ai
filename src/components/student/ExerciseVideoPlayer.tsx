function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id =
        u.searchParams.get("v") ??
        (u.hostname.includes("youtu.be") ? u.pathname.slice(1) : null);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function ExerciseVideoPlayer({ url, title }: { url: string; title?: string }) {
  const embed = youtubeEmbedUrl(url);

  if (embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={embed}
          title={title ?? "Vídeo de execução"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (/\.(mp4|webm)(\?|$)/i.test(url)) {
    return (
      <video
        src={url}
        controls
        playsInline
        className="aspect-video w-full rounded-xl border border-border bg-black"
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold text-primary text-center"
    >
      Abrir vídeo de execução
    </a>
  );
}
