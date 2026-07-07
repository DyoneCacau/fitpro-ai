export type VideoEmbed =
  | { kind: "youtube" | "vimeo"; embedUrl: string }
  | { kind: "file"; src: string }
  | { kind: "external"; href: string }
  | { kind: "invalid" };

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id || null;
  }
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = u.searchParams.get("v");
    if (v) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    // /embed/ID, /shorts/ID, /live/ID, /v/ID
    const marker = parts.findIndex((p) => ["embed", "shorts", "live", "v"].includes(p));
    if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
  }
  return null;
}

function vimeoId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "");
  if (!host.endsWith("vimeo.com")) return null;
  // vimeo.com/123456789, player.vimeo.com/video/123456789, vimeo.com/channels/x/123456789
  const parts = u.pathname.split("/").filter(Boolean);
  const numeric = parts.reverse().find((p) => /^\d+$/.test(p));
  return numeric ?? null;
}

/** Normaliza qualquer link (YouTube, Vimeo, arquivo .mp4/.webm, ou externo) para reprodução no app. */
export function getVideoEmbed(rawUrl: string | null | undefined): VideoEmbed {
  const url = (rawUrl ?? "").trim();
  if (!url) return { kind: "invalid" };

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: "invalid" };
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") return { kind: "invalid" };

  const yt = youtubeId(u);
  if (yt) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${yt}` };

  const vm = vimeoId(u);
  if (vm) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${vm}` };

  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(u.pathname)) {
    return { kind: "file", src: url };
  }

  return { kind: "external", href: url };
}

export function isPlayableVideoUrl(url: string | null | undefined): boolean {
  const e = getVideoEmbed(url);
  return e.kind === "youtube" || e.kind === "vimeo" || e.kind === "file";
}
