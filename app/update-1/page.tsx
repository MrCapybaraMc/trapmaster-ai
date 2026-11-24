"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Trap = {
  id: string; title: string; summary: string; description: string;
  video_url: string | null; extra_video_url: string | null; schematic_url: string | null; instructions: string;
  armor_types: string[]; puller: boolean; totems: boolean; feather_falling: boolean;
  servers: string[]; trap_type: string; collection: "traps" | "library" | "backup";
  created_by: string; published: boolean;
};

const emptyTrap = {
  title: "", summary: "", description: "", video_url: "", extra_video_url: "", schematic_url: "",
  instructions: "", armor_types: [] as string[], puller: false, totems: false,
  feather_falling: false, servers: [] as string[], trap_type: "standard",
  collection: "traps" as const,
};

export default function UpdateOnePage() {
  const [supabase] = useState(() => typeof window === "undefined" ? null as unknown as ReturnType<typeof createClient> : createClient());
  const [traps, setTraps] = useState<Trap[]>([]);
  const [selected, setSelected] = useState<Trap | null>(null);
  const [tab, setTab] = useState<"traps" | "library" | "backup">("traps");
  const [search, setSearch] = useState("");
  const [armor, setArmor] = useState("all");
  const [puller, setPuller] = useState("all");
  const [totems, setTotems] = useState("all");
  const [feather, setFeather] = useState("all");
  const [form, setForm] = useState(emptyTrap);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [extraFilter, setExtraFilter] = useState("all");
  const [trapTypeFilter, setTrapTypeFilter] = useState("all");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });
  const [editingTrap, setEditingTrap] = useState<string | null>(null);
  const [comboCode,setComboCode] = useState("");
  const [userId, setUserId] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setMessage("Zaloguj się, aby korzystać z katalogu."); return; }
    setUserId(auth.user.id);
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id",auth.user.id);
    setIsStaff((roleRows??[]).some((row:{role:string})=>["admin","headadmin","owner"].includes(row.role)));
    const { data: preferences } = await supabase.from("tm_user_settings").select("videos_muted").eq("user_id",auth.user.id).maybeSingle();
    setVideoMuted(preferences?.videos_muted ?? true);
    const { data, error } = await supabase.from("traps").select("*").order("created_at", { ascending: false });
    if (error) { setMessage("Nie udało się pobrać katalogu. Sprawdź, czy migracja Update 1.0 została wdrożona w bazie beta."); return; }
    setTraps((data ?? []) as Trap[]);
  }, [supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!userId || !search.trim()) return;
    const timer = window.setTimeout(() => { void supabase.from("tm_search_events").insert({ user_id:userId, search_term:search.trim() }); }, 800);
    return () => window.clearTimeout(timer);
  }, [search,userId,supabase]);

  const visible = useMemo(() => traps.filter((trap) => {
    if (tab === "backup" ? trap.collection !== "backup" : trap.collection === "backup") return false;
    if (tab === "backup" && trap.puller) return false;
    if (search && !`${trap.title} ${trap.summary} ${trap.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (armor !== "all" && !trap.armor_types.includes(armor)) return false;
    if (puller !== "all" && trap.puller !== (puller === "yes")) return false;
    if (totems !== "all" && trap.totems !== (totems === "yes")) return false;
    if (feather !== "all" && trap.feather_falling !== (feather === "yes")) return false;
    if (extraFilter !== "all" && !trap.servers.includes(extraFilter)) return false;
    if (trapTypeFilter !== "all" && trap.trap_type !== trapTypeFilter) return false;
    return true;
  }), [traps, tab, search, armor, puller, totems, feather, extraFilter, trapTypeFilter]);

  async function saveTrap(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const payload = { ...form, video_url: form.video_url || null, extra_video_url: form.extra_video_url || null, schematic_url: form.schematic_url || null, updated_by: userId, published: true };
    const { error } = editingTrap
      ? await supabase.from("traps").update(payload).eq("id", editingTrap)
      : await supabase.from("traps").insert({ ...payload, created_by: userId });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setForm(emptyTrap); setEditingTrap(null); setShowForm(false); setMessage(editingTrap ? "Trap zaktualizowany." : "Trap dodany."); await load();
  }

  async function redeemCombo(event: React.FormEvent) {
    event.preventDefault();
    const { data, error } = await supabase.rpc("tm_redeem_supercombo", { p_code: comboCode.trim() });
    setMessage(error ? error.message : `Kod wykorzystany. Nagrody: ${(data?.discount_codes ?? []).join(", ") || "dodane do konta"}.`);
    if (!error) setComboCode("");
  }

  async function saveVideoMute(next: boolean) {
    setVideoMuted(next);
    const { error } = await supabase.from("tm_user_settings").upsert({ user_id: userId, videos_muted: next }, { onConflict: "user_id" });
    if (error) setMessage(error.message);
  }

  async function openTrap(trap: Trap) {
    setSelected(trap);
    await supabase.from("trap_views").insert({ user_id: userId, trap_id: trap.id });
    const { data } = await supabase.from("trap_reviews").select("rating").eq("trap_id", trap.id);
    const ratings = (data ?? []).map((item: {rating:number}) => item.rating);
    setReviewSummary({ count: ratings.length, average: ratings.length ? ratings.reduce((a:number,b:number)=>a+b,0)/ratings.length : 0 });
  }

  function editTrap(trap: Trap) {
    setEditingTrap(trap.id);
    setForm({ title:trap.title, summary:trap.summary, description:trap.description, video_url:trap.video_url??"", extra_video_url:trap.extra_video_url??"", schematic_url:trap.schematic_url??"", instructions:trap.instructions, armor_types:trap.armor_types??[], puller:trap.puller, totems:trap.totems, feather_falling:trap.feather_falling, servers:trap.servers??[], trap_type:trap.trap_type, collection:trap.collection });
    setShowForm(true); setSelected(null);
  }

  function toggleCompare(trapId: string) {
    setCompareIds(current => current.includes(trapId) ? current.filter(id=>id!==trapId) : current.length<3 ? [...current,trapId] : current);
  }

  async function toggleFavorite(trapId: string) {
    const { data: existing } = await supabase.from("trap_favorites").select("trap_id").eq("trap_id", trapId).maybeSingle();
    const result = existing
      ? await supabase.from("trap_favorites").delete().eq("trap_id", trapId)
      : await supabase.from("trap_favorites").insert({ trap_id: trapId, user_id: userId });
    setMessage(result.error ? result.error.message : existing ? "Usunięto z ulubionych." : "Dodano do ulubionych.");
  }

  async function addReview(trapId: string) {
    const raw = window.prompt("Ocena 1–10:");
    const rating = Number(raw);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) return;
    const body = window.prompt("Krótka opinia (opcjonalnie):") ?? "";
    const { error } = await supabase.from("trap_reviews").upsert({ trap_id: trapId, user_id: userId, rating, body }, { onConflict: "trap_id,user_id" });
    setMessage(error ? error.message : "Opinia zapisana.");
    if (!error && selected) await openTrap(selected);
  }

  async function deleteTrap(trapId: string) {
    if (!isStaff || !window.confirm("Usunąć ten trap?")) return;
    const { error } = await supabase.from("traps").delete().eq("id",trapId);
    setMessage(error ? error.message : "Trap usunięty.");
    if (!error) { setSelected(null); await load(); }
  }

  async function deleteReview(trapId: string) {
    if (!window.confirm("Usunąć swoją opinię?")) return;
    const { error } = await supabase.from("trap_reviews").delete().eq("trap_id",trapId).eq("user_id",userId);
    setMessage(error ? error.message : "Opinia usunięta.");
    if (!error && selected) await openTrap(selected);
  }

  async function reportTrap(trapId: string) {
    const details = window.prompt("Co jest nieaktualne lub nie działa?");
    if (!details?.trim()) return;
    const { error } = await supabase.from("trap_bug_reports").insert({ trap_id: trapId, user_id: userId, category: "other", details });
    setMessage(error ? error.message : "Zgłoszenie wysłane.");
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white";
  return (
    <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <video key={tab} className="fixed inset-0 h-full w-full object-cover opacity-20" src="/videos/trap.mp4" autoPlay loop muted={videoMuted} playsInline />
        <header className="relative z-10 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · BETA</p><h1 className="mt-2 text-4xl font-black">Katalog trapów</h1><p className="mt-2 text-white/60">Wersja robocza Update 1.0 — osobna strona testowa.</p></div>
          <button onClick={() => void saveVideoMute(!videoMuted)} className="rounded-xl border border-white/15 px-3 py-2 text-sm">{videoMuted ? "Włącz dźwięk" : "Wycisz film"}</button><nav className="flex flex-wrap gap-2"><Link href="/update-1/daily" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Daily</Link><Link href="/update-1/community" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Społeczność</Link><Link href="/update-1/account" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Konto</Link><Link href="/update-1/admin" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Panel</Link><Link href="/update-1/creators" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Twórcy</Link><Link href="/update-1/opinions" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Opinie</Link><Link href="/" className="rounded-xl border border-white/15 px-3 py-2 text-sm">Powrót</Link></nav>
        </header>
        <nav className="mb-5 flex flex-wrap gap-2">
          {(["traps","library","backup"] as const).map((item) => <button key={item} onClick={() => { setTab(item); setSelected(null); }} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab===item?"bg-purple-600":"bg-white/10"}`}>{item==="traps"?"Trapy":item==="library"?"Biblioteka":"Backupy"}</button>)}
          <button onClick={() => setShowForm((v)=>!v)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold">+ Dodaj trap</button>
        </nav>
        {message && <p role="status" className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">{message}</p>}
        <form onSubmit={redeemCombo} className="relative z-10 mb-5 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/40 p-3"><input value={comboCode} onChange={e=>setComboCode(e.target.value)} placeholder="Kod SuperCombo" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"/><button className="rounded-lg bg-purple-600 px-4 py-2 font-bold">Wykorzystaj kod</button></form>
        {showForm && <form onSubmit={saveTrap} className="mb-6 grid gap-3 rounded-2xl border border-purple-400/30 bg-white/5 p-5 md:grid-cols-2">
          <input className={inputClass} placeholder="Nazwa trapa" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
          <input className={inputClass} placeholder="Krótki opis" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/>
          <input className={inputClass} placeholder="Link do filmu" value={form.video_url} onChange={e=>setForm({...form,video_url:e.target.value})}/>
          <input className={inputClass} placeholder="Dodatkowy film instruktażowy" value={form.extra_video_url} onChange={e=>setForm({...form,extra_video_url:e.target.value})}/>
          <input className={inputClass} placeholder="Link do schematu" value={form.schematic_url} onChange={e=>setForm({...form,schematic_url:e.target.value})}/>
          <textarea className={inputClass+" md:col-span-2"} placeholder="Instrukcja budowy" value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/>
          <textarea className={inputClass+" md:col-span-2"} placeholder="Pełny opis" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          <select className={inputClass} value={form.collection} onChange={e=>setForm({...form,collection:e.target.value as typeof form.collection})}><option value="traps">Trapy</option><option value="library">Biblioteka</option><option value="backup">Backup</option></select>
          <select className={inputClass} value={form.trap_type} onChange={e=>setForm({...form,trap_type:e.target.value})}><option value="standard">Standardowy</option><option value="piston">Piston trap</option><option value="railgun">Railgun</option></select>
          <div className="flex flex-wrap gap-4 md:col-span-2">{["Diax zbroja 4/3","Diax bez enchantów","Netherite 4/3","Ametystowa","Szmaragdowa"].map(x=><label key={x} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.armor_types.includes(x)} onChange={e=>setForm({...form,armor_types:e.target.checked?[...form.armor_types,x]:form.armor_types.filter(v=>v!==x)})}/>{x}</label>)}</div>
          <div className="flex flex-wrap gap-5 md:col-span-2">{([["puller","Puller"],["totems","Totemy"],["feather_falling","Feather Falling"]] as const).map(([key,label])=><label key={key} className="flex items-center gap-2"><input type="checkbox" checked={form[key]} onChange={e=>setForm({...form,[key]:e.target.checked})}/>{label}</label>)}</div>
          <div className="flex flex-wrap gap-4 md:col-span-2">{["BananaSMP","Hoplite"].map(x=><label key={x} className="flex items-center gap-2"><input type="checkbox" checked={form.servers.includes(x)} onChange={e=>setForm({...form,servers:e.target.checked?[...form.servers,x]:form.servers.filter(v=>v!==x)})}/>{x}</label>)}</div>
          <button disabled={busy} className="rounded-xl bg-purple-600 px-5 py-3 font-bold disabled:opacity-50">{busy?"Zapisywanie…":editingTrap?"Zapisz zmiany":"Zapisz trap"}</button>
        </form>}
        <section className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-5">
          <input className={inputClass} placeholder="Szukaj trapa…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <select className={inputClass} value={armor} onChange={e=>setArmor(e.target.value)}><option value="all">Każda zbroja</option>{["Diax zbroja 4/3","Diax bez enchantów","Netherite 4/3","Ametystowa","Szmaragdowa"].map(x=><option key={x}>{x}</option>)}</select>
          <select className={inputClass} value={puller} onChange={e=>setPuller(e.target.value)}><option value="all">Puller: dowolny</option><option value="yes">Z Pullerem</option><option value="no">Bez Pullera</option></select>
          <select className={inputClass} value={totems} onChange={e=>setTotems(e.target.value)}><option value="all">Totemy: dowolnie</option><option value="yes">Z totemami</option><option value="no">Bez totemów</option></select>
          <select className={inputClass} value={feather} onChange={e=>setFeather(e.target.value)}><option value="all">Feather Falling: dowolnie</option><option value="yes">Z Feather Falling</option><option value="no">Bez Feather Falling</option></select>
          <select className={inputClass} value={extraFilter} onChange={e=>setExtraFilter(e.target.value)}><option value="all">Serwer: dowolny</option><option value="BananaSMP">BananaSMP</option><option value="Hoplite">Hoplite</option></select>
          <select className={inputClass} value={trapTypeFilter} onChange={e=>setTrapTypeFilter(e.target.value)}><option value="all">Typ: dowolny</option><option value="piston">Piston trap</option><option value="railgun">Railgun</option></select>
        </section>
        {selected ? <article className="rounded-2xl border border-purple-400/30 bg-white/5 p-6">
          <button onClick={()=>setSelected(null)} className="mb-4 text-sm text-purple-300">← Wróć do listy</button><h2 className="text-3xl font-black">{selected.title}</h2><p className="mt-2 text-white/70">{selected.summary}</p><p className="mt-4 whitespace-pre-wrap">{selected.description}</p><p className="mt-3 text-sm text-white/60">Średnia ocena: {reviewSummary.average.toFixed(1)}/10 ({reviewSummary.count} ocen)</p><h3 className="mt-5 font-bold">Instrukcja</h3><p className="mt-2 whitespace-pre-wrap text-white/80">{selected.instructions||"Brak instrukcji."}</p>
          <div className="mt-5 flex flex-wrap gap-3">{selected.video_url&&<a className="rounded-xl bg-red-600 px-4 py-2" href={selected.video_url} target="_blank" rel="noreferrer">Otwórz film</a>}{(selected.feather_falling||selected.totems)&&!selected.puller&&selected.extra_video_url&&<a className="rounded-xl bg-red-800 px-4 py-2" href={selected.extra_video_url} target="_blank" rel="noreferrer">Dodatkowy film</a>}{selected.schematic_url&&<a className="rounded-xl bg-blue-600 px-4 py-2" href={selected.schematic_url} onClick={() => { void supabase.rpc("tm_record_trap_download", { p_trap_id: selected.id }); }} target="_blank" rel="noreferrer">Pobierz schemat</a>}</div>
          {(!selected.feather_falling&&!selected.totems)&&<p className="mt-5 rounded-xl bg-amber-500/10 p-3 text-amber-200">proszę po wybudowaniu trapa po funnelach 30blokow w dół i dripstone</p>}
          {(selected.feather_falling||selected.totems)&&!selected.puller&&<p className="mt-3 text-sm text-purple-200">Dla konfiguracji z totemami lub Feather Falling bez Pullera wymagany jest dodatkowy film instruktażowy.</p>}
          <div className="mt-5 flex flex-wrap gap-2">{(selected.created_by===userId||isStaff)&&<button onClick={()=>editTrap(selected)} className="rounded-xl border border-white/20 px-4 py-2">Edytuj trap</button>}{isStaff&&<button onClick={()=>void deleteTrap(selected.id)} className="rounded-xl border border-red-400/30 px-4 py-2 text-red-300">Usuń trap</button>}<button onClick={()=>void toggleFavorite(selected.id)} className="rounded-xl border border-white/20 px-4 py-2">☆ Ulubione</button><button onClick={()=>void addReview(selected.id)} className="rounded-xl border border-white/20 px-4 py-2">Oceń 1–10</button><button onClick={()=>void deleteReview(selected.id)} className="rounded-xl border border-white/20 px-4 py-2">Usuń moją opinię</button><button onClick={()=>void reportTrap(selected.id)} className="rounded-xl border border-white/20 px-4 py-2">Zgłoś błąd</button></div>
        </article> : <><div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="font-bold">Porównanie ({compareIds.length}/3)</p><div className="mt-3 grid gap-2 md:grid-cols-3">{compareIds.map(id=>{const item=traps.find(t=>t.id===id);return item?<article key={id} className="rounded-xl bg-black/20 p-3"><strong>{item.title}</strong><p className="mt-2 text-xs text-white/60">Zbroja: {item.armor_types.join(", ")||"—"}</p><p className="text-xs text-white/60">Puller: {item.puller?"Tak":"Nie"} · Totemy: {item.totems?"Tak":"Nie"}</p><p className="text-xs text-white/60">Feather Falling: {item.feather_falling?"Tak":"Nie"}</p><p className="text-xs text-white/60">Serwery: {item.servers.join(", ")||"—"}</p></article>:null;})}</div></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map(trap=><article key={trap.id} className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-200">{trap.collection}</span><span className="text-xs text-white/50">{trap.trap_type}</span></div><h2 className="text-xl font-bold">{trap.title}</h2><p className="mt-2 line-clamp-3 text-sm text-white/65">{trap.summary||trap.description}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">{trap.armor_types.map(a=><span key={a} className="rounded bg-white/10 px-2 py-1">{a}</span>)}{trap.puller&&<span className="rounded bg-white/10 px-2 py-1">Puller</span>}{trap.totems&&<span className="rounded bg-white/10 px-2 py-1">Totemy</span>}{trap.feather_falling&&<span className="rounded bg-white/10 px-2 py-1">Feather Falling</span>}</div><div className="mt-5 flex gap-2"><button onClick={()=>void openTrap(trap)} className="flex-1 rounded-xl bg-purple-600 px-4 py-2 font-bold">Szczegóły</button><button onClick={()=>toggleCompare(trap.id)} className="rounded-xl border border-white/15 px-3 py-2 text-xs">{compareIds.includes(trap.id)?"Usuń porównanie":"Porównaj"}</button></div></article>)}
          {!visible.length&&<p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-white/50 md:col-span-2 lg:col-span-3">Brak trapów spełniających kryteria. Po wdrożeniu migracji dodaj pierwszy wpis.</p>}
        </div></>}
      </div>
    </main>
  );
}
