"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

type Message = { id: string; body: string; sender_id: string; created_at: string };

export default function CreatorChatPage() {
  const [supabase] = useState(() => typeof window === "undefined" ? null : createClient());
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("Sprawdzanie dostępu…");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setStatus("Zaloguj się, aby otworzyć czat TrapCreators.");
      return;
    }
    setUserId(auth.user.id);
    const { data, error } = await supabase
      .from("creator_messages")
      .select("id,body,sender_id,created_at")
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      setStatus(error.code === "42501" ? "Czat jest dostępny wyłącznie dla rangi TrapCreator." : error.message);
    } else {
      setMessages(data ?? []);
      setStatus("Czat grupowy TrapCreators");
    }
  }

  useEffect(() => {
    // Defer the initial async load so state updates happen outside the effect's synchronous phase.
    const task = Promise.resolve().then(() => load());
    return () => { void task; };
  }, [supabase]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("creator_messages").insert({ sender_id: userId, body: body.trim() });
    setBusy(false);
    if (error) {
      setStatus(error.code === "42501" ? "Brak dostępu — wymagana ranga TrapCreator." : error.message);
    } else {
      setBody("");
      await load();
    }
  }

  return <main className="min-h-screen bg-[#080912] px-4 py-8 text-white"><div className="mx-auto max-w-3xl">
    <Link href="/" className="text-sm text-white/60">← Wróć</Link>
    <header className="my-7 rounded-3xl border border-violet-400/20 bg-[#111322] p-7"><p className="text-xs font-bold uppercase tracking-widest text-violet-300">STREFA TWÓRCÓW</p><h1 className="mt-2 text-3xl font-black">Czat TrapCreators</h1><p className="mt-2 text-sm text-white/50">{status}</p></header>
    <section className="rounded-2xl border border-white/10 bg-[#111322] p-4">
      <div className="max-h-[55vh] space-y-3 overflow-y-auto">{messages.map(m=><article key={m.id} className={m.sender_id===userId?"ml-8 rounded-xl bg-violet-500/15 p-3":"mr-8 rounded-xl bg-black/30 p-3"}><p className="whitespace-pre-wrap text-sm">{m.body}</p><p className="mt-2 text-[10px] text-white/35">{new Date(m.created_at).toLocaleString("pl-PL")}</p></article>)}</div>
      <form onSubmit={send} className="mt-4 flex gap-2"><input value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} placeholder="Napisz wiadomość…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm" /><button disabled={busy || !body.trim()} className="rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold disabled:opacity-40">{busy?"…":"Wyślij"}</button></form>
    </section>
  </div></main>;
}
