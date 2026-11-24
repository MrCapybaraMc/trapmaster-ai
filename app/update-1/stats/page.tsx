"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Leader={account_name:string;downloads?:number;days?:number;searches?:number;seconds?:number};
export default function StatsPage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [stats,setStats]=useState<Record<string,unknown>>({});
 const [boards,setBoards]=useState<Record<string,Leader[]>>({});
 const [message,setMessage]=useState("");
 async function load(){
  const [{data:s,error:sError},{data:b,error:bError}]=await Promise.all([db.rpc("tm_public_stats"),db.rpc("tm_public_leaderboards")]);
  if(sError||bError)setMessage(sError?.message??bError?.message??"Nie udało się pobrać statystyk.");
  setStats((s??{}) as Record<string,unknown>);setBoards((b??{}) as Record<string,Leader[]>);
 }
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();},[]);
 const labels:Record<string,string>={most_downloaded:"Najwięcej pobrań",longest_subscription:"Najdłuższy łączny dostęp",most_searched:"Najczęściej wyszukujący",most_active:"Najwięcej czasu na stronie"};
 const metric=(key:string,row:Leader)=>key==="most_downloaded"?row.downloads:key==="longest_subscription"?row.days:key==="most_searched"?row.searches:Math.floor((row.seconds??0)/60);
 const suffix=(key:string)=>key==="most_downloaded"?" pobrań":key==="longest_subscription"?" dni":key==="most_searched"?" wyszukiwań":" min";
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
  <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · STATISTICS</p><h1 className="mt-2 text-4xl font-black">Statystyki strony</h1><p className="mt-2 text-white/60">Rankingi używają nazw kont, a nie nicków Minecraft.</p></header>
  {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
  <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["total_accounts","Wszystkie konta"],["site_visits","Odwiedziny"],["active_users_30d","Aktywni użytkownicy (30 dni)"],["traps","Opublikowane trapy"],["admins","Administracja"],["headadmins","HeadAdmin"],["trapcreators","TrapCreators"]].map(([key,label])=><article key={key} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-white/50">{label}</p><p className="mt-2 text-3xl font-black">{String(stats[key]??"—")}</p></article>)}</section>
  <p className="mb-6 text-sm text-white/50">Start strony: {stats.site_started_at?new Date(String(stats.site_started_at)).toLocaleDateString("pl-PL"):"—"}</p>
  <section className="grid gap-5 md:grid-cols-2">{Object.entries(labels).map(([key,label])=><article key={key} className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-4 text-lg font-bold">{label}</h2><ol className="space-y-2">{(boards[key]??[]).map((row,i)=><li key={row.account_name} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2"><span>{i+1}. {row.account_name}</span><strong>{metric(key,row)}{suffix(key)}</strong></li>)}</ol>{!(boards[key]??[]).length&&<p className="text-sm text-white/50">Brak danych.</p>}</article>)}</section>
 </div></main>;
}
