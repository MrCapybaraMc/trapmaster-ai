import Link from "next/link";

const changes = [
  "Dodano osobną stronę Aktualizacje z historią wersji.",
  "Dodano osobną stronę Ogłoszenia społeczności.",
  "Administratorzy mogą publikować i usuwać ogłoszenia.",
  "Dodano osobne Forum społeczności z publikowaniem postów.",
  "Usprawniono nawigację pomiędzy stronami TRAPMASTERS.",
];

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-[#070910] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black tracking-wider">TRAP<span className="text-purple-400">MASTERS</span></Link>
          <nav className="flex flex-wrap gap-3 text-sm"><Link href="/forum" className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10">Forum</Link><Link href="/ogloszenia" className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10">Ogłoszenia</Link><Link href="/" className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10">Strona główna</Link></nav>
        </header>
        <section className="rounded-3xl border border-purple-400/30 bg-[#11111c] p-6 md:p-10">
          <p className="text-xs font-bold tracking-[0.3em] text-purple-300">CENTRUM INFORMACJI</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Aktualizacje</h1>
          <p className="mt-4 text-white/70">Tutaj znajdziesz informacje o nowych funkcjach i zmianach na stronie.</p>
          <div className="mt-8 rounded-2xl border border-purple-400/30 bg-purple-950/30 p-6">
            <p className="text-sm font-bold tracking-widest text-purple-200">AKTUALNA WERSJA</p>
            <p className="mt-2 text-4xl font-black">v.beta.09</p>
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-black">Co nowego?</h2>
            <ul className="mt-5 space-y-3">{changes.map((change) => <li key={change} className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-4"><span className="text-purple-300">✦</span><span className="leading-6 text-white/80">{change}</span></li>)}</ul>
          </div>
        </section>
      </div>
    </main>
  );
}
