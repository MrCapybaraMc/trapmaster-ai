"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Store={minecraft_payment_recipient:string;package_prices:Record<string,number>;donation_minimum:number};
type OrderResult={order_id:string;price_m:number;total_price_m?:number;discount_percent:number;donation_amount?:number};
export default function PayPage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [store,setStore]=useState<Store|null>(null);
 const [nick,setNick]=useState("");const [packageType,setPackageType]=useState("day");const [codes,setCodes]=useState("");const [donation,setDonation]=useState("0");
 const [result,setResult]=useState<OrderResult|null>(null);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){const {data,error}=await db.from("tm_store_settings").select("minecraft_payment_recipient,package_prices,donation_minimum").eq("id",true).maybeSingle();if(error)setMessage(error.message);else setStore(data as Store|null);}
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();},[]);
 async function createOrder(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");setResult(null);
  const donationValue=Number(donation);if(!Number.isSafeInteger(donationValue)||donationValue<0||(donationValue>0&&donationValue<(store?.donation_minimum??50000))){setBusy(false);setMessage("Darowizna musi wynosić 0 lub co najmniej "+(store?.donation_minimum??50000)+".");return;}
  const {data,error}=await db.rpc("tm_create_order_with_donation",{p_minecraft_nick:nick.trim(),p_package_type:packageType,p_discount_codes:codes.trim(),p_donation:donationValue});
  setBusy(false);if(error){setMessage(error.message);return;}setResult(data as OrderResult);setMessage("Zamówienie utworzone. Poczekaj na weryfikację płatności przez administrację.");
 }
 const field="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white";
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-3xl">
  <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · PAY</p><h1 className="mt-2 text-4xl font-black">Kup dostęp</h1><p className="mt-2 text-white/60">Ceny pobierane są z ustawień sklepu bety.</p></header>
  {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
  {store&&<section className="mb-6 grid gap-3 sm:grid-cols-2">{Object.entries(store.package_prices??{}).map(([key,value])=><article key={key} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm text-white/50">{key}</p><strong className="text-2xl">{value}M</strong></article>)}</section>}
  <form onSubmit={createOrder} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
   <label className="text-sm text-white/70">Nick Minecraft do przypisania pakietu</label><input className={field} required minLength={3} maxLength={16} pattern="[A-Za-z0-9_]{3,16}" value={nick} onChange={e=>setNick(e.target.value)} placeholder="Twój nick Minecraft"/>
   <label className="text-sm text-white/70">Pakiet</label><select className={field} value={packageType} onChange={e=>setPackageType(e.target.value)}><option value="day">Dzień</option><option value="week">Tydzień</option><option value="month">Miesiąc</option><option value="forever">Na zawsze</option></select>
   <label className="text-sm text-white/70">Kody rabatowe (kilka oddziel przecinkiem, jeśli Owner włączył łączenie)</label><input className={field} value={codes} onChange={e=>setCodes(e.target.value)} placeholder="KOD1, KOD2"/>
   <label className="text-sm text-white/70">Dobrowolna darowizna w walucie serwera (0 lub min. {store?.donation_minimum??50000})</label><input className={field} type="number" min="0" step="1" value={donation} onChange={e=>setDonation(e.target.value)}/>
   <button disabled={busy||!store} className="rounded-xl bg-purple-600 px-5 py-3 font-bold disabled:opacity-50">{busy?"Tworzenie zamówienia…":"Utwórz zamówienie"}</button>
  </form>
  {result&&<section className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5"><h2 className="text-xl font-bold">Zamówienie utworzone</h2><p className="mt-2">Numer: <strong>{result.order_id}</strong></p><p>Odbiorca płatności Minecraft: <strong>{store?.minecraft_payment_recipient||"Nie skonfigurowano — skontaktuj się z Ownerem"}</strong></p><p>Rabat: {result.discount_percent}%</p><p>Kwota łączna: <strong>{(result.total_price_m??result.price_m).toFixed(2)}M</strong></p><p className="mt-2 text-sm text-white/70">Pakiet zostanie przyznany po zatwierdzeniu zamówienia przez administrację.</p></section>}
 </div></main>;
}
