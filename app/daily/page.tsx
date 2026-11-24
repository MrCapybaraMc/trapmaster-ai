"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function DailyPage() {
  const [supabase] = useState(() => typeof window === "undefined" ? null : createClient());
  const [points, setPoints] = useState<number | null>(null);
  const [history, setHistory] = useState<{id:string;amount:number;reason:string;created_at:string}[]>([]);
  const [status, setStatus] = useState("Ładowanie Daily…");
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    if (!supabase) return;
    let active=true;
    void (async()=>{
      const {data:auth}=await supabase.auth.getUser();
      if(!auth.user){if(active)setStatus("Zaloguj się, aby zobaczyć swoje punkty Daily.");return;}
      const [wallet,ledger]=await Promise.all([
        supabase.from("daily_wallets").select("points").eq("user_id",auth.user.id).maybeSingle(),
        supabase.from("daily_ledger").select("id,amount,reason,created_at").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(30)
      ]);
      if(!active)return;
      if(wallet.error||ledger.error)setStatus("Historia Daily będzie dostępna po wdrożeniu schematu bazy beta.");
      else {setPoints(wallet.data?.points ?? 0);setHistory(ledger.data ?? []);setStatus("Twoje konto Daily");}
    })();
    return ()=>{active=false;};
  },[supabase]);
  return <main className="relative min-h-screen overflow-hidden bg-[#080912] text-white">
    <video className="fixed inset-0 h-full w-full object-cover opacity-25" src="/videos/daily.mp4" autoPlay loop muted={muted} playsInline />
    <div className="fixed inset-0 bg-[#080912]/75" />
    <div className="relative mx-auto max-w-4xl px-4 py-8"><Link href="/" className="text-sm text-white/60">← Wróć</Link>
      <header className="my-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-300/20 bg-[#111322]/90 p-7"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-300">TRAPMASTERS DAILY</p><h1 className="mt-2 text-4xl font-black">Daily</h1><p className="mt-2 text-sm text-white/50">{status}</p></div><button onClick={()=>setMuted(v=>!v)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">{muted?"Włącz dźwięk":"Wycisz film"}</button></header>
      <section className="rounded-3xl border border-white/10 bg-[#111322]/90 p-7"><p className="text-sm text-white/50">Twoje punkty</p><p className="mt-2 text-5xl font-black tabular-nums">{points===null?"—":points.toLocaleString("pl-PL")}</p><p className="mt-3 text-xs text-white/40">Transfery i nagrody zostaną aktywowane po wdrożeniu bezpiecznych operacji serwerowych, aby nie dało się zmieniać salda z poziomu przeglądarki.</p></section>
      <section className="mt-5 rounded-3xl border border-white/10 bg-[#111322]/90 p-6"><h2 className="text-xl font-black">Historia punktów</h2>{history.length===0?<p className="mt-4 text-sm text-white/45">Brak wpisów w historii.</p>:<div className="mt-4 divide-y divide-white/10">{history.map(item=><div key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span>{item.reason}<small className="mt-1 block text-xs text-white/35">{new Date(item.created_at).toLocaleString("pl-PL")}</small></span><b className={item.amount>=0?"text-emerald-300":"text-rose-300"}>{item.amount>0?"+":""}{item.amount}</b></div>)}</div>}</section>
    </div>
  </main>;
}
