import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, ImagePlus, Camera, X, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadUserFile, getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Feed — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <Feed />
    </AuthGate>
  ),
});

interface Post {
  id: string;
  author_id: string;
  personal_id: string;
  text: string | null;
  photo_url: string | null;
  kind: string;
  created_at: string;
  authorName?: string | null;
  post_likes?: { user_id: string }[];
  post_comments?: { id: string }[];
}

function Feed() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [activeComment, setActiveComment] = useState<string | null>(null);

  // Get the user's personal_id (scope)
  const { data: profile } = useQuery({
    queryKey: ["myProfile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("personal_id")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const scopePersonalId = profile?.personal_id ?? user?.id ?? null;

  const { data: posts = [], refetch } = useQuery({
    queryKey: ["feed", scopePersonalId],
    enabled: !!scopePersonalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, post_likes(user_id), post_comments(id)")
        .eq("personal_id", scopePersonalId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Post[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
        rows.forEach((r) => { r.authorName = map.get(r.author_id) ?? null; });
      }
      return rows;
    },
  });

  // Realtime updates
  useEffect(() => {
    if (!scopePersonalId) return;
    const ch = supabase
      .channel("feed-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => refetch())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [scopePersonalId, refetch]);

  return (
    <AppShell>
      <PageHeader
        title="Feed"
        subtitle="Sua comunidade"
        right={
          <button
            onClick={() => setComposing(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <section className="px-5 py-5 space-y-4">
        {posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">Nenhum post ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Seja o primeiro a compartilhar uma conquista!
            </p>
          </div>
        )}
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            currentUserId={user?.id ?? ""}
            onToggleComments={() => setActiveComment(activeComment === p.id ? null : p.id)}
            showComments={activeComment === p.id}
          />
        ))}
      </section>

      {composing && scopePersonalId && (
        <ComposeModal
          personalId={scopePersonalId}
          onClose={() => setComposing(false)}
          onPosted={() => {
            setComposing(false);
            qc.invalidateQueries({ queryKey: ["feed"] });
          }}
        />
      )}
    </AppShell>
  );
}

function PostCard({
  post,
  currentUserId,
  onToggleComments,
  showComments,
}: {
  post: Post;
  currentUserId: string;
  onToggleComments: () => void;
  showComments: boolean;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const liked = post.post_likes?.some((l) => l.user_id === currentUserId) ?? false;
  const likeCount = post.post_likes?.length ?? 0;
  const commentCount = post.post_comments?.length ?? 0;

  useEffect(() => {
    if (post.photo_url) {
      void getSignedUrl("post-media", post.photo_url).then(setPhotoUrl);
    }
  }, [post.photo_url]);

  const toggleLike = async () => {
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
    }
  };

  const name = post.authorName ?? "Aluno";
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const when = new Date(post.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <article className="rounded-3xl bg-gradient-card border border-border overflow-hidden shadow-card">
      <header className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{name}</p>
          <p className="text-[11px] text-muted-foreground">
            {when} · <span className="text-primary">#{post.kind}</span>
          </p>
        </div>
      </header>
      {post.text && <p className="px-4 pb-3 text-sm whitespace-pre-wrap">{post.text}</p>}
      {photoUrl && (
        <img src={photoUrl} alt="" className="w-full aspect-square object-cover bg-secondary" />
      )}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            liked ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
          {likeCount}
        </button>
        <button
          onClick={onToggleComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount}
        </button>
      </div>
      {showComments && <Comments postId={post.id} currentUserId={currentUserId} />}
    </article>
  );
}

function Comments({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at");
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const nameMap = new Map<string, string | null>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        (profs ?? []).forEach((p) => nameMap.set(p.id, p.full_name));
      }
      return rows.map((r) => ({ ...r, authorName: nameMap.get(r.user_id) ?? "Usuário" }));
    },
  });

  const send = async () => {
    if (!text.trim()) return;
    await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      text: text.trim(),
    });
    setText("");
    qc.invalidateQueries({ queryKey: ["comments", postId] });
  };

  return (
    <div className="border-t border-border bg-background/30 p-3 space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="text-xs">
          <span className="font-bold">{c.authorName}: </span>
          <span className="text-muted-foreground">{c.text}</span>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 rounded-xl bg-background border border-input px-3 py-2 text-sm outline-none focus:border-primary"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="rounded-xl bg-gradient-primary px-3 text-primary-foreground"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ComposeModal({
  personalId,
  onClose,
  onPosted,
}: {
  personalId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"livre" | "treino" | "dieta" | "evolucao">("livre");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onPick = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user || (!text.trim() && !file)) return;
    setSaving(true);
    try {
      let photoPath: string | null = null;
      if (file) {
        photoPath = await uploadUserFile("post-media", user.id, file);
      }
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        personal_id: personalId,
        text: text.trim() || null,
        photo_url: photoPath,
        kind,
      });
      if (error) throw error;
      onPosted();
    } catch (e) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Erro desconhecido";
      alert(`Erro ao publicar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col max-h-[90dvh] rounded-t-3xl bg-card border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-lg font-bold">Novo post</h3>
          <button onClick={onClose} className="rounded-full bg-secondary p-1.5"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {(["livre", "treino", "dieta", "evolucao"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                #{k}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="No que está pensando?"
            rows={3}
            className="w-full rounded-2xl bg-background border border-input p-3 text-sm outline-none focus:border-primary resize-none"
          />
          {preview && (
            <div className="mt-3 relative">
              <img src={preview} alt="" className="max-h-56 w-full rounded-2xl object-cover" />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {!preview && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center gap-2 cursor-pointer rounded-2xl border border-input bg-secondary px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-transform">
                <ImagePlus className="h-4 w-4" />
                Galeria
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
                />
              </label>
              <label className="flex items-center justify-center gap-2 cursor-pointer rounded-2xl border border-input bg-secondary px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-transform">
                <Camera className="h-4 w-4" />
                Câmera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
                />
              </label>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={submit}
            disabled={saving || (!text.trim() && !file)}
            className="rounded-full bg-gradient-primary px-6 py-2.5 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {saving ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
