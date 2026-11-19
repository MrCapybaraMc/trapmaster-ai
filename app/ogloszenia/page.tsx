"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Announcement = { id: string; title: string; content: string; created_by: string; created_at: string };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const loadAnnouncements = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("site_announcements").select("id,title,content,created_by,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) setMessage(error.message);
    else setItems((data ?? []) as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (mounted) {
        setLoggedIn(!!user);
        setUserId(user?.id ?? "");
      }
      if (user) {
        const { data: role } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
        if (mounted) setIsAdmin(role?.role === "admin" || role?.role === "owner");
      }
      await loadAnnouncements();
    }
    void init();
    return () => { mounted = false; };
  }, [loadAnnouncements]);

  async function publish() {
    if (!isAdmin || !loggedIn) return;
    if (title.trim().length < 3 || content.trim().length < 5) { setMessage("Tytuł musi mieć min. 3 znaki, a treść min. 5 znaków."); return; }
    setSending(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("site_announcements").insert({ title: title.trim(), content: content.trim(), created_by: userId });
    setSending(false);
    if (error) { setMessage(error.message); return; }
    setTitle(""); setContent(""); setMessage("Ogłoszenie zostało opublikowane.");
    await loadAnnouncements();
  }

  async function remove(id: string) {
    if (!isAdmin || !window.confirm("Usunąć to ogłoszenie?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("site_announcements").delete().eq("id", id);
    if (error) setMessage(error.message);
    else { setMessage("Ogłoszenie usunięto."); await loadAnnouncements(); }
  }

  return (
    <main className="min-h-screen bg-[#070910] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black tracking-wider">TRAP<span className="text-purple-400">MASTERS</span></Link>
          <nav className="flex flex-wrap gap-3 text-sm"><Link href="/forum" className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10">Forum</Link><Link href="/aktualizacje" className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10">Aktualizacje</Link><Link href="/" className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10">Strona główna</Link></nav>
        </header>
        <section className="mb-8 rounded-3xl border border-amber-400/25 bg-[#11111c] p-6 md:p-10">
          <p className="text-xs font-bold tracking-[0.3em] text-amber-200">TRAPMASTERS COMMUNITY</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Ogłoszenia</h1>
          <p className="mt-4 text-white/70">Oficjalne komunikaty i ważne informacje od administracji.</p>
        </section>
        {isAdmin && <section className="mb-8 rounded-2xl border border-amber-400/25 bg-[#11111c] p-6">
          <h2 className="text-xl font-black text-amber-200">Opublikuj ogłoszenie</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Tytuł ogłoszenia" className="mt-4 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 outline-none focus:border-amber-300" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={5} placeholder="Treść ogłoszenia..." className="mt-3 w-full rounded-xl border border-white/15 bg-black/40 p-4 outline-none focus:border-amber-300" />
          <button onClick={publish} disabled={sending} className="mt-3 rounded-xl bg-amber-500 px-6 py-3 font-bold text-black hover:bg-amber-400 disabled:opacity-50">{sending ? "Publikowanie..." : "Opublikuj"}</button>
        </section>}
        {message && <p className="mb-5 text-sm text-amber-200">{message}</p>}
        {loading ? <p className="text-white/60">Ładowanie ogłoszeń...</p> : items.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center text-white/60">Nie ma jeszcze żadnych ogłoszeń.</p> : <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-2xl border border-amber-400/20 bg-[#11111c] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-amber-100">{item.title}</h2><time className="mt-2 block text-xs text-white/45">{new Date(item.created_at).toLocaleString("pl-PL")}</time></div>{isAdmin && <button onClick={() => remove(item.id)} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10">Usuń</button>}</div>
          <p className="mt-5 whitespace-pre-wrap break-words leading-7 text-white/85">{item.content}</p>
        </article>)}</div>}
      </div>
    </main>
  );
}
