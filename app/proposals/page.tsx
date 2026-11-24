"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function ProposalsPage() {
  const [supabase] = useState(() => typeof window === "undefined" ? null : createClient());
  const [loggedIn, setLoggedIn] = useState(false);
  const [trapUrl, setTrapUrl] = useState("");
  const [trapDescription, setTrapDescription] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (supabase) void supabase.auth.getUser().then(({ data }) => {
      if (active) setLoggedIn(Boolean(data.user));
    });
    return () => { active = false; };
  }, [supabase]);

  async function submitTrap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !loggedIn) { setMessage("Zaloguj się, aby wysłać propozycję."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.from("trap_proposals").insert({
      youtube_url: trapUrl.trim() || null,
      description: trapDescription.trim() || null,
    });
    setBusy(false);
    setMessage(error ? (error.code === "42501" ? "Ta funkcja jest dostępna dla rangi TrapMasters." : error.message) : "Propozycja trapa została wysłana!");
    if (!error) { setTrapUrl(""); setTrapDescription(""); }
  }

  async function submitIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !loggedIn) { setMessage("Zaloguj się, aby wysłać propozycję."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.from("website_proposals").insert({
      title: ideaTitle.trim(), description: ideaDescription.trim(),
    });
    setBusy(false);
    setMessage(error ? error.message : "Pomysł na stronę został wysłany. Dziękujemy!");
    if (!error) { setIdeaTitle(""); setIdeaDescription(""); }
  }

  const field = "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400";
  return <main className="min-h-screen bg-[#080912] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-4xl">
      <Link href="/" className="text-sm font-bold text-white/60 hover:text-white">← Wróć na TRAPMASTERS</Link>
      <header className="my-8 rounded-3xl border border-violet-400/20 bg-[#111322] p-7 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[.3em] text-violet-300">TRAPMASTERS COMMUNITY</p>
        <h1 className="mt-3 text-4xl font-black">Propozycje</h1>
        <p className="mt-3 text-white/60">Podziel się trapem lub pomysłem na rozwój strony.</p>
      </header>
      {!loggedIn && <p className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Zaloguj się na konto TrapMasters, aby wysyłać propozycje.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <form onSubmit={submitTrap} className="rounded-3xl border border-white/10 bg-[#111322] p-6">
          <h2 className="text-2xl font-black">Złóż propozycję trapa</h2>
          <p className="mt-2 text-sm text-white/50">Wysyłanie propozycji jest dostępne dla rangi TrapMasters.</p>
          <label className="mt-5 block text-sm font-bold">Link do filmu YouTube<input value={trapUrl} onChange={e=>setTrapUrl(e.target.value)} className={field} placeholder="https://youtube.com/..." /></label>
          <label className="mt-4 block text-sm font-bold">Opis pomysłu<textarea value={trapDescription} onChange={e=>setTrapDescription(e.target.value)} className={field} rows={5} placeholder="Opisz, jakiego trapa chcesz zobaczyć..." /></label>
          <button disabled={busy || !loggedIn} className="mt-5 w-full rounded-xl bg-violet-500 px-4 py-3 font-black disabled:opacity-40">{busy ? "Wysyłanie…" : "Wyślij propozycję"}</button>
        </form>
        <form onSubmit={submitIdea} className="rounded-3xl border border-white/10 bg-[#111322] p-6">
          <h2 className="text-2xl font-black">Propozycje dla strony</h2>
          <p className="mt-2 text-sm text-white/50">Zaproponuj nową funkcję lub zmianę w serwisie.</p>
          <label className="mt-5 block text-sm font-bold">Tytuł pomysłu<input required minLength={3} maxLength={120} value={ideaTitle} onChange={e=>setIdeaTitle(e.target.value)} className={field} placeholder="Np. Porównywarka trapów" /></label>
          <label className="mt-4 block text-sm font-bold">Opis<textarea required minLength={5} maxLength={3000} value={ideaDescription} onChange={e=>setIdeaDescription(e.target.value)} className={field} rows={5} placeholder="Opisz, jak miałoby to działać..." /></label>
          <button disabled={busy || !loggedIn} className="mt-5 w-full rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 font-black text-violet-100 disabled:opacity-40">{busy ? "Wysyłanie…" : "Wyślij pomysł"}</button>
        </form>
      </div>
      {message && <p role="status" className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">{message}</p>}
      <p className="mt-8 text-center text-xs text-white/35">Propozycje są zapisywane w bazie beta. Wysyłanie trapów wymaga rangi TrapMasters.</p>
    </div>
  </main>;
}
