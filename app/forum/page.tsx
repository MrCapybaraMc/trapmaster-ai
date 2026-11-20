"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ForumPost = { id: string; user_id: string; author_name: string; author_avatar_url: string | null; content: string; created_at: string };

export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  const loadPosts = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("forum_posts").select("id,user_id,author_name,author_avatar_url,content,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) setMessage(error.message);
    else setPosts((data ?? []) as ForumPost[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (mounted) setLoggedIn(!!data.session?.user);
      const { data: adminData } = await supabase.rpc("is_admin");
      if (mounted) setIsAdmin(adminData === true);
      await loadPosts();
    }
    void init();
    return () => { mounted = false; };
  }, [loadPosts]);

  async function deletePost(id: string) {
    if (!isAdmin || !window.confirm("Czy na pewno usunąć ten post?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("forum_posts").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    setMessage("Post został usunięty.");
    await loadPosts();
  }

  async function submitPost() {
    if (!loggedIn) { setMessage("Zaloguj się, aby dodać wpis."); return; }
    if (!content.trim()) { setMessage("Wpisz treść posta."); return; }
    setSending(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("create_forum_post", { p_content: content.trim() });
    setSending(false);
    if (error) { setMessage(error.message); return; }
    setContent(""); setMessage("Post został opublikowany.");
    await loadPosts();
  }

  return (
    <main className="min-h-screen bg-[#070910] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black tracking-wider">TRAP<span className="text-purple-400">MASTERS</span></Link>
          <Link href="/" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold hover:bg-white/10">Powrót na stronę</Link>
        </header>
        <section className="mb-8 rounded-3xl border border-purple-400/30 bg-[#11111c] p-6 md:p-10">
          <p className="text-xs font-bold tracking-[0.3em] text-purple-300">TRAPMASTERS COMMUNITY</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Forum społeczności</h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/70">Rozmawiaj z innymi graczami, dziel się pomysłami i poznawaj społeczność TRAPMASTERS.</p>
        </section>
        <section className="rounded-3xl border border-white/10 bg-[#0d111b] p-5 md:p-8">
          <h2 className="text-xl font-black text-purple-200">Dodaj post</h2>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} rows={4} placeholder="Napisz coś do społeczności..." className="mt-4 w-full resize-y rounded-xl border border-white/15 bg-black/40 p-4 outline-none focus:border-purple-400" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-white/45">{content.length}/2000</span><button onClick={submitPost} disabled={sending || !loggedIn} className="rounded-xl bg-purple-600 px-7 py-3 font-bold hover:bg-purple-500 disabled:opacity-50">{sending ? "Wysyłanie..." : "Opublikuj post"}</button></div>
          {!loggedIn && <p className="mt-3 text-sm text-amber-200">Zaloguj się, aby publikować posty. <Link href="/register" className="underline">Zaloguj / zarejestruj</Link></p>}
          {message && <p className="mt-3 text-sm text-purple-200">{message}</p>}
        </section>
        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-2xl font-black">Najnowsze posty</h2><button onClick={() => { setLoading(true); void loadPosts(); }} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Odśwież</button></div>
          {loading ? <p className="text-white/60">Ładowanie postów...</p> : posts.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center text-white/60">Nie ma jeszcze żadnych postów. Napisz pierwszy!</p> : <div className="space-y-4">{posts.map((post) => <article key={post.id} className="rounded-2xl border border-purple-400/20 bg-[#11111c] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{post.author_avatar_url ? <img src={post.author_avatar_url} alt="" className="h-10 w-10 rounded-full border border-purple-300/30 object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-purple-900">👤</div>}<span className="truncate font-bold text-purple-200">{post.author_name}</span></div><time className="text-xs text-white/45">{new Date(post.created_at).toLocaleString("pl-PL")}</time></div><p className="mt-4 whitespace-pre-wrap break-words leading-7 text-white/85">{post.content}</p>{isAdmin && <button onClick={() => deletePost(post.id)} className="mt-4 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10">Usuń post</button>}</article>)}</div>}
        </section>
      </div>
    </main>
  );
}
