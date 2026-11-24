"use client";

import { useEffect, useMemo, useState } from "react";

type Trap = {
  id: string;
  name: string;
  gameMode: "BananaSMP" | "Hoplite" | "Oba";
  type: string;
  armor: string[];
  puller: boolean;
  totems: boolean;
  featherFalling: boolean;
  description: string;
  videoUrl: string;
  schematicUrl: string;
  instructions: string;
};

const STORAGE_KEY = "trapmasters_beta_traps_v1";
const starterTraps: Trap[] = [
  {
    id: "starter-rail",
    name: "Railgun — przykład",
    gameMode: "BananaSMP",
    type: "Railgun",
    armor: ["Netherite", "Diamond"],
    puller: true,
    totems: false,
    featherFalling: true,
    description: "Przykładowa karta demonstracyjna. Zastąp ją właściwą konfiguracją trapa.",
    videoUrl: "",
    schematicUrl: "",
    instructions: "Tutaj pojawi się pełna instrukcja budowy.",
  },
  {
    id: "starter-piston",
    name: "Piston trap — przykład",
    gameMode: "Hoplite",
    type: "Piston trap",
    armor: ["Iron", "Diamond"],
    puller: false,
    totems: true,
    featherFalling: false,
    description: "Przykładowa karta demonstracyjna do sprawdzenia filtrów.",
    videoUrl: "",
    schematicUrl: "",
    instructions: "Tutaj pojawi się pełna instrukcja budowy.",
  },
];

const emptyForm = {
  name: "",
  gameMode: "BananaSMP" as Trap["gameMode"],
  type: "Piston trap",
  armor: "Netherite, Diamond",
  puller: false,
  totems: false,
  featherFalling: false,
  description: "",
  videoUrl: "",
  schematicUrl: "",
  instructions: "",
};

export default function TrapsPage() {
  const [traps, setTraps] = useState<Trap[]>(starterTraps);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("Wszystkie");
  const [armor, setArmor] = useState("Wszystkie");
  const [puller, setPuller] = useState("Dowolnie");
  const [totems, setTotems] = useState("Dowolnie");
  const [feather, setFeather] = useState("Dowolnie");
  const [type, setType] = useState("Wszystkie");
  const [selected, setSelected] = useState<Trap | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTraps(JSON.parse(saved) as Trap[]);
      const savedFavorites = localStorage.getItem(STORAGE_KEY + "_favorites");
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites) as string[]);
    } catch {
      // Ignore invalid local preview data and keep the sample cards.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(traps));
  }, [traps, ready]);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY + "_favorites", JSON.stringify(favorites));
  }, [favorites, ready]);

  const filtered = useMemo(() => traps.filter((trap) => {
    const text = (trap.name + " " + trap.description + " " + trap.type).toLowerCase();
    return (!search || text.includes(search.toLowerCase()))
      && (mode === "Wszystkie" || trap.gameMode === mode)
      && (armor === "Wszystkie" || trap.armor.includes(armor))
      && (puller === "Dowolnie" || trap.puller === (puller === "Tak"))
      && (totems === "Dowolnie" || trap.totems === (totems === "Tak"))
      && (feather === "Dowolnie" || trap.featherFalling === (feather === "Tak"))
      && (type === "Wszystkie" || trap.type === type);
  }), [traps, search, mode, armor, puller, totems, feather, type]);

  function addTrap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    const next: Trap = {
      ...form,
      id: crypto.randomUUID(),
      name: form.name.trim(),
      armor: form.armor.split(",").map((item) => item.trim()).filter(Boolean),
    };
    setTraps((current) => [next, ...current]);
    setSelected(next);
    setForm(emptyForm);
    setShowForm(false);
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <main className="min-h-screen bg-[#080912] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.18),_transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <a href="/" className="text-sm font-bold text-white/60 transition hover:text-white">← Wróć na TRAPMASTERS</a>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">BETA PREVIEW • UPDATE 1.0</span>
        </header>

        <section className="mb-8 rounded-3xl border border-violet-400/20 bg-[#111322]/90 p-6 shadow-2xl sm:p-9">
          <p className="text-xs font-black uppercase tracking-[.32em] text-violet-300">TRAPMASTERS LIBRARY</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Biblioteka <span className="text-violet-300">trapów</span></h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Wyszukuj, filtruj i zapisuj ulubione konstrukcje. Otwórz kartę, aby zobaczyć wymagania, film i schemat.</p>
            </div>
            <button onClick={() => setShowForm((value) => !value)} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-black transition hover:bg-violet-400">{showForm ? "Zamknij formularz" : "+ Dodaj trap"}</button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-white/45">Wszystkie trapy</p><p className="mt-1 text-2xl font-black">{traps.length}</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-white/45">Wyniki</p><p className="mt-1 text-2xl font-black">{filtered.length}</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-white/45">Ulubione</p><p className="mt-1 text-2xl font-black">{favorites.length}</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-white/45">Tryby</p><p className="mt-1 text-2xl font-black">2+</p></div>
          </div>
        </section>

        {showForm && <form onSubmit={addTrap} className="mb-8 rounded-3xl border border-violet-400/25 bg-[#111322] p-6 sm:p-8">
          <h2 className="text-2xl font-black">Dodaj nowy trap</h2>
          <p className="mt-2 text-sm text-white/50">Formularz demonstracyjny bety. Wpis zostanie zapisany lokalnie w tej przeglądarce.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">Nazwa trapa<input required value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-normal outline-none focus:border-violet-400" placeholder="Np. Piston drop trap" /></label>
            <label className="text-sm font-bold">Tryb<select value={form.gameMode} onChange={(e) => setForm({...form, gameMode:e.target.value as Trap["gameMode"]})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>BananaSMP</option><option>Hoplite</option><option>Oba</option></select></label>
            <label className="text-sm font-bold">Typ<select value={form.type} onChange={(e) => setForm({...form, type:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>Piston trap</option><option>Railgun</option><option>Inny</option></select></label>
            <label className="text-sm font-bold">Zbroje (oddziel przecinkami)<input value={form.armor} onChange={(e) => setForm({...form, armor:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-normal" /></label>
            <label className="text-sm font-bold">Link do filmu<input value={form.videoUrl} onChange={(e) => setForm({...form, videoUrl:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-normal" placeholder="https://youtube.com/..." /></label>
            <label className="text-sm font-bold">Link do schematu<input value={form.schematicUrl} onChange={(e) => setForm({...form, schematicUrl:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-normal" placeholder="https://..." /></label>
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.puller} onChange={(e) => setForm({...form, puller:e.target.checked})} /> Puller</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.totems} onChange={(e) => setForm({...form, totems:e.target.checked})} /> Totemy</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.featherFalling} onChange={(e) => setForm({...form, featherFalling:e.target.checked})} /> Feather Falling</label>
          </div>
          <label className="mt-5 block text-sm font-bold">Krótki opis<textarea value={form.description} onChange={(e) => setForm({...form, description:e.target.value})} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-normal" /></label>
          <label className="mt-4 block text-sm font-bold">Instrukcja budowy<textarea value={form.instructions} onChange={(e) => setForm({...form, instructions:e.target.value})} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-normal" /></label>
          <button type="submit" className="mt-5 rounded-xl bg-violet-500 px-6 py-3 font-black hover:bg-violet-400">Zapisz trap</button>
        </form>}

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#111322]/90 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj nazwy lub opisu..." className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400 sm:col-span-2" />
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>Wszystkie</option><option>BananaSMP</option><option>Hoplite</option></select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>Wszystkie</option><option>Piston trap</option><option>Railgun</option><option>Inny</option></select>
            <select value={armor} onChange={(e) => setArmor(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>Wszystkie</option><option>Netherite</option><option>Diamond</option><option>Iron</option></select>
            <select value={puller} onChange={(e) => setPuller(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>Dowolnie</option><option>Tak</option><option>Nie</option></select>
            <select value={totems} onChange={(e) => setTotems(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>Dowolnie</option><option>Tak</option><option>Nie</option></select>
            <select value={feather} onChange={(e) => setFeather(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b0d18] px-4 py-3"><option>Dowolnie</option><option>Tak</option><option>Nie</option></select>
          </div>
          <button onClick={() => {setSearch("");setMode("Wszystkie");setType("Wszystkie");setArmor("Wszystkie");setPuller("Dowolnie");setTotems("Dowolnie");setFeather("Dowolnie");}} className="mt-3 text-xs font-bold text-violet-300 hover:text-violet-200">Wyczyść filtry</button>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((trap) => <article key={trap.id} className="rounded-2xl border border-white/10 bg-[#111322]/90 p-5 transition hover:border-violet-400/40">
            <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-200">{trap.gameMode}</span><button onClick={() => toggleFavorite(trap.id)} aria-label="Dodaj do ulubionych" className="text-xl text-amber-300">{favorites.includes(trap.id) ? "★" : "☆"}</button></div>
            <h3 className="mt-4 text-xl font-black">{trap.name}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-white/55">{trap.description || "Brak opisu."}</p>
            <div className="mt-4 flex flex-wrap gap-2">{trap.armor.map((item) => <span key={item} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/65">{item}</span>)}<span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/65">{trap.type}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]"><span className="rounded-lg bg-black/25 p-2">Puller<br/><b>{trap.puller ? "Tak" : "Nie"}</b></span><span className="rounded-lg bg-black/25 p-2">Totemy<br/><b>{trap.totems ? "Tak" : "Nie"}</b></span><span className="rounded-lg bg-black/25 p-2">Feather<br/><b>{trap.featherFalling ? "Tak" : "Nie"}</b></span></div>
            <button onClick={() => setSelected(trap)} className="mt-5 w-full rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-100 hover:bg-violet-500/20">Zobacz szczegóły</button>
          </article>)}
        </div>
        {filtered.length === 0 && <p className="rounded-2xl border border-white/10 bg-[#111322] p-10 text-center text-white/55">Brak trapów pasujących do filtrów.</p>}

        {selected && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setSelected(null)}>
          <section onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-violet-400/25 bg-[#111322] p-6 sm:rounded-3xl sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.25em] text-violet-300">KARTA TRAPA</p><h2 className="mt-2 text-3xl font-black">{selected.name}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg border border-white/10 px-3 py-2 text-sm">Zamknij ✕</button></div>
            <p className="mt-4 leading-7 text-white/65">{selected.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl bg-black/25 p-3">Tryb<br/><b>{selected.gameMode}</b></div><div className="rounded-xl bg-black/25 p-3">Puller<br/><b>{selected.puller ? "Tak" : "Nie"}</b></div><div className="rounded-xl bg-black/25 p-3">Totemy<br/><b>{selected.totems ? "Tak" : "Nie"}</b></div><div className="rounded-xl bg-black/25 p-3">Feather Falling<br/><b>{selected.featherFalling ? "Tak" : "Nie"}</b></div><div className="rounded-xl bg-black/25 p-3">Zbroje<br/><b>{selected.armor.join(", ") || "Nie podano"}</b></div><div className="rounded-xl bg-black/25 p-3">Typ<br/><b>{selected.type}</b></div></div>
            {selected.videoUrl && <a href={selected.videoUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-red-500/15 px-4 py-3 font-bold text-red-200">▶ Otwórz film</a>}
            {selected.schematicUrl && <a href={selected.schematicUrl} target="_blank" rel="noreferrer" className="ml-2 mt-5 inline-flex rounded-xl bg-violet-500/15 px-4 py-3 font-bold text-violet-200">Pobierz schemat</a>}
            <h3 className="mt-7 text-xl font-black">Instrukcja budowy</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-white/70">{selected.instructions || "Instrukcja nie została jeszcze dodana."}</p>
            {(!selected.puller && (selected.featherFalling || selected.totems)) && <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Ten wariant wymaga dodatkowego materiału wideo z instrukcją.</p>}
            {(!selected.featherFalling && !selected.totems) && <p className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/10 p-4 text-sm text-violet-100">proszę po wybudowaniu trapa po funnelach 30blokow w dół i dripstone</p>}
          </section>
        </div>}

        <footer className="mt-12 border-t border-white/10 pt-5 text-center text-xs leading-6 text-white/35">TrapMasters Update 1.0 • Widok testowy. Wpisy i ulubione są obecnie zapisywane tylko w pamięci lokalnej tej przeglądarki; wspólna baza, logowanie i uprawnienia zostaną podłączone po przygotowaniu osobnego środowiska beta.</footer>
      </div>
    </main>
  );
}
