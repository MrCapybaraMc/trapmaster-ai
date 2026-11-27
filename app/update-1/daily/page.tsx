"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Transfer = { id:string; sender_id:string; recipient_id:string; amount:number; created_at:string };
type Achievement = { achievement_id:string; earned_at:string; tm_achievements?:{title:string;description:string;points:number}[]|{title:string;description:string;points:number}|null };

export default function DailyPage() {
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [balance,setBalance]=useState(0);
 const [transfers,setTransfers]=useState<Transfer[]>([]);
 const [achievements,setAchievements]=useState<Achievement[]>([]);
 const [nickname,setNickname]=useState("");
 const [amount,setAmount]=useState("1");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [sentToday,setSentToday]=useState(0);
 
 const [userId,setUserId]=useState("");
 async function load(){
  const {data:auth}=await db.auth.getUser();
  if(!auth.user){setMessage("Zaloguj się, aby otworzyć Daily.");return;}
  setUserId(auth.user.id);
  const utcStart=new Date();utcStart.setUTCHours(0,0,0,0);
  const [{data:points},{data:history},{data:earned},{count:todayCount}] = await Promise.all([
   db.from("daily_points").select("balance").eq("user_id",auth.user.id).maybeSingle(),
   db.from("daily_point_transfers").select("*").or(`sender_id.eq.${auth.user.id},recipient_id.eq.${auth.user.id}`).order("created_at",{ascending:false}).limit(30),
   db.from("user_achievements").select("achievement_id,earned_at,tm_achievements(title,description,points)").eq("user_id",auth.user.id),
   db.from("daily_point_transfers").select("id",{count:"exact",head:true}).eq("sender_id",auth.user.id).gte("created_at",utcStart.toISOString())
  ]);
  setBalance(points?.balance??0);setTransfers((history??[]) as Transfer[]);setAchievements((earned??[]) as Achievement[]);setSentToday(todayCount??0);

 }
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();},[]);
 async function transfer(e:FormEvent){
  e.preventDefault();const parsed=Number(amount);
  if(!Number.isSafeInteger(parsed)||parsed<=0){setMessage("Wpisz poprawną liczbę punktów.");return;}
  setBusy(true);const {error}=await db.rpc("tm_transfer_daily_points_to_nick",{p_recipient_nick:nickname.trim(),p_amount:parsed});
  setBusy(false);setMessage(error?error.message:"Przelew wykonany.");if(!error){setNickname("");await load();}
 }
 const field="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white";
 return <main className="relative min-h-screen overflow-hidden bg-[#100d08] px-4 py-8 text-white sm:px-8">
  <video className="fixed inset-0 h-full w-full object-cover opacity-25" src="/videos/daily.mp4" autoPlay loop muted playsInline/>
  <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-[#100d08]/90 via-[#16100b]/85 to-purple-950/70"/>
  <div className="relative mx-auto max-w-5xl">
   <header className="mb-8"><p className="text-xs font-black uppercase tracking-[.35em] text-amber-300">TRAPMASTERS REWARDS</p><h1 className="mt-3 text-4xl font-black md:text-5xl">DAILY <span className="text-amber-300">REWARDS</span></h1><p className="mt-3 max-w-2xl text-white/75">Odbieraj punkty, buduj swoją kolekcję osiągnięć i wymieniaj punkty z innymi graczami.</p></header>
   {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
   <section className="mb-6 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-amber-300/20 bg-black/45 p-5"><p className="text-sm text-white/60">Twoje Daily Points</p><p className="mt-2 text-4xl font-black text-amber-200">{balance.toLocaleString("pl-PL")}</p></article><article className="rounded-2xl border border-amber-300/20 bg-black/45 p-5"><p className="text-sm text-white/60">Odznaki</p><p className="mt-2 text-4xl font-black">{achievements.length}</p></article><article className="rounded-2xl border border-white/10 bg-black/40 p-5"><p className="text-sm text-white/60">Historia przelewów</p><p className="mt-2 text-4xl font-black">{transfers.length}</p></article></section>
   <form onSubmit={transfer} className="mb-6 grid gap-3 rounded-2xl border border-amber-300/20 bg-black/45 p-6"><h2 className="text-xl font-bold">Przelej punkty</h2><p className="text-sm text-white/60">Możesz przesłać maksymalnie 80% salda i wykonać do 2 przelewów dziennie. Dziś wykorzystano: {sentToday}/2.</p><input className={field} required placeholder="Nick konta odbiorcy" value={nickname} onChange={e=>setNickname(e.target.value)}/><input className={field} required type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/><button disabled={busy||!userId||sentToday>=2} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black transition hover:bg-amber-200 disabled:opacity-50">{busy?"Wysyłanie…":"Wyślij punkty"}</button></form>
   <section className="mb-6 rounded-2xl border border-white/10 bg-black/40 p-6"><h2 className="mb-4 text-xl font-bold">Osiągnięcia</h2><div className="grid gap-2 sm:grid-cols-2">{achievements.map(item=>{const achievement=Array.isArray(item.tm_achievements)?item.tm_achievements[0]:item.tm_achievements;return <article key={item.achievement_id} className="rounded-xl bg-white/5 p-3"><strong>{achievement?.title??item.achievement_id}</strong><p className="mt-1 text-sm text-white/60">{achievement?.description}</p><p className="mt-2 text-xs text-emerald-200">+{achievement?.points??0} pkt</p></article>;})}</div>{!achievements.length&&<p className="text-sm text-white/50">Zdobądź pierwsze osiągnięcie, pobierając schemat lub oceniając trap.</p>}</section>
   <section className="rounded-2xl border border-white/10 bg-black/40 p-6"><h2 className="mb-4 text-xl font-bold">Historia przelewów</h2><div className="space-y-2">{transfers.map(t=><article key={t.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white/5 p-3"><span>{t.sender_id===userId?"Wysłano":"Otrzymano"}</span><strong className={t.sender_id===userId?"text-red-300":"text-emerald-300"}>{t.sender_id===userId?"−":"+"}{t.amount} pkt</strong><time className="text-xs text-white/40">{new Date(t.created_at).toLocaleString("pl-PL")}</time></article>)}{!transfers.length&&<p className="text-white/50">Brak przelewów.</p>}</div></section>
  </div>
 </main>;
}
