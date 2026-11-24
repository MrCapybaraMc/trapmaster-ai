"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order={id:string;package_type:string;status:string;expires_at:string|null;created_at:string;recipient_minecraft_nick?:string|null;is_gift?:boolean};
type Trap={id:string;title:string};
export default function UpdateAccountPage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [nickname,setNickname]=useState("");
 const [orders,setOrders]=useState<Order[]>([]);
 const [favorites,setFavorites]=useState<Trap[]>([]);
 const [downloads,setDownloads]=useState<Trap[]>([]);
 const [balance,setBalance]=useState(0);
 const [usesPuller,setUsesPuller]=useState(false);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(){
  const {data:auth}=await db.auth.getUser();if(!auth.user){setMessage("Zaloguj się, aby zobaczyć konto.");return;}
  const [{data:profile},{data:o},{data:f},{data:d},{data:p},{data:s}]=await Promise.all([
   db.from("profiles").select("nickname").eq("user_id",auth.user.id).maybeSingle(),
   db.from("orders").select("id,package_type,status,expires_at,created_at,recipient_minecraft_nick,is_gift").eq("user_id",auth.user.id).order("created_at",{ascending:false}),
   db.from("trap_favorites").select("trap_id,traps(id,title)"),
   db.from("tm_download_events").select("trap_id,traps(id,title)").eq("user_id",auth.user.id).order("downloaded_at",{ascending:false}).limit(30),
   db.from("daily_points").select("balance").eq("user_id",auth.user.id).maybeSingle(),
   db.from("tm_user_settings").select("uses_puller").eq("user_id",auth.user.id).maybeSingle()
  ]);
  setNickname(profile?.nickname??"");setOrders((o??[]) as Order[]);
  setFavorites(((f??[]).map((x:any)=>x.traps).filter(Boolean)) as Trap[]);
  setDownloads(((d??[]).map((x:any)=>x.traps).filter(Boolean)) as Trap[]);
  setBalance(p?.balance??0);setUsesPuller(s?.uses_puller??false);
 }
 useEffect(()=>{void load();},[]);
 async function savePuller(next:boolean){
  setBusy(true);setUsesPuller(next);
  const {data:auth}=await db.auth.getUser();
  const {error}=await db.from("tm_user_settings").upsert({user_id:auth.user?.id,uses_puller:next},{onConflict:"user_id"});
  setBusy(false);setMessage(error?error.message:"Zapisano ustawienia.");
 }
 const active=orders.find(o=>o.status==="approved"&&(o.expires_at===null||new Date(o.expires_at)>new Date()));
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
  <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · ACCOUNT</p><h1 className="mt-2 text-4xl font-black">Moje konto</h1><p className="mt-2 text-white/60">Profil, dostęp, ulubione i historia.</p></header>
  {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
  <section className="mb-6 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-white/5 p-5"><p className="text-sm text-white/50">Nick konta</p><p className="mt-2 text-xl font-bold">{nickname||"—"}</p></article><article className="rounded-2xl bg-white/5 p-5"><p className="text-sm text-white/50">Daily Points</p><p className="mt-2 text-3xl font-black">{balance}</p></article><article className="rounded-2xl bg-white/5 p-5"><p className="text-sm text-white/50">Aktywny pakiet</p><p className="mt-2 text-xl font-bold">{active?(active.expires_at?active.package_type:"Bezterminowy"):"Brak aktywnego pakietu"}</p>{active?.expires_at&&<p className="mt-1 text-sm text-purple-200">Wygasa: {new Date(active.expires_at).toLocaleString("pl-PL")}</p>}</article></section>
  <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-3 text-xl font-bold">Ustawienia filtrów</h2><label className="flex items-center gap-3"><input type="checkbox" checked={usesPuller} disabled={busy} onChange={e=>void savePuller(e.target.checked)}/> Korzystam z Pullera (ukryj backupy przeznaczone dla graczy bez Pullera)</label></section>
  <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-4 text-xl font-bold">Historia pakietów</h2>{orders.map(o=><article key={o.id} className="mb-2 flex flex-wrap justify-between gap-2 rounded-xl bg-black/20 p-3"><span>{o.package_type}{o.is_gift?" · prezent dla "+(o.recipient_minecraft_nick??"konta"):""}</span><span>{o.status}</span><span className="text-xs text-white/40">{new Date(o.created_at).toLocaleDateString("pl-PL")}</span></article>)}{!orders.length&&<p className="text-white/50">Brak zamówień.</p>}</section>
  <div className="grid gap-6 md:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-3 text-xl font-bold">Ulubione trapy</h2>{favorites.map(t=><p key={t.id} className="border-b border-white/10 py-2">{t.title}</p>)}{!favorites.length&&<p className="text-white/50">Brak ulubionych.</p>}</section><section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-3 text-xl font-bold">Ostatnio pobierane</h2>{downloads.map((t,i)=><p key={t.id+"-"+i} className="border-b border-white/10 py-2">{t.title}</p>)}{!downloads.length&&<p className="text-white/50">Brak pobrań.</p>}</section></div>
  <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-2 text-xl font-bold">Bezpieczeństwo konta</h2><p className="mb-3 text-sm text-white/60">Hasła nie są dostępne do odczytu dla nikogo, także Ownera. Możesz skorzystać z bezpiecznej zmiany lub odzyskiwania hasła.</p><a href="/reset-password" className="inline-flex rounded-xl bg-purple-600 px-4 py-2 font-bold">Zmień / odzyskaj hasło</a></section>
 </div></main>;
}
