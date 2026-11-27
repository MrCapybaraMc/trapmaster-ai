"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Enchant = { user_id:string; enchant_code:string; level:number; quantity:number };
type Offer = { id:string; seller_id:string; enchant_code:string; enchant_level:number; quantity:number; price_points:number; requested_enchant_code:string|null; requested_enchant_level:number|null; requested_quantity:number; created_at:string };
const names:Record<string,string> = {
 discount:"Zniżka", duration:"Długość", premium:"Premium", enchanter:"Enchantowiec",
 weakness:"Słabość", daily:"Daily", lucky:"Lucky", curiosity:"Ciekawicz",
 trapmaster:"TrapMaster", capybara:"Kapibarątko"
};
const fields="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white";
export default function EnchantTradePage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [userId,setUserId]=useState("");
 const [inventory,setInventory]=useState<Enchant[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [code,setCode]=useState("discount");
 const [level,setLevel]=useState("1");
 const [quantity,setQuantity]=useState("1");
 const [price,setPrice]=useState("100");
 const [wantCode,setWantCode]=useState("");
 const [wantLevel,setWantLevel]=useState("1");
 const [wantQuantity,setWantQuantity]=useState("0");
 const [balance,setBalance]=useState(0);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(){
  const {data:auth}=await db.auth.getUser();
  if(!auth.user){setMessage("Zaloguj się, aby handlować enchantami.");return;}
  setUserId(auth.user.id);
  const [{data:items},{data:list},{data:points}]=await Promise.all([
   db.from("tm_user_enchants").select("user_id,enchant_code,level,quantity").eq("user_id",auth.user.id).gt("quantity",0).order("enchant_code"),
   db.from("tm_enchant_trade_offers").select("id,seller_id,enchant_code,enchant_level,quantity,price_points,requested_enchant_code,requested_enchant_level,requested_quantity,created_at").eq("status","open").order("created_at",{ascending:false}).limit(100),
   db.from("daily_points").select("balance").eq("user_id",auth.user.id).maybeSingle()
  ]);
  setInventory((items??[]) as Enchant[]);setOffers((list??[]) as Offer[]);setBalance(points?.balance??0);
 }
 useEffect(()=>{void load();},[]);
 async function createOffer(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  const {error}=await db.rpc("tm_create_enchant_trade_offer",{p_enchant_code:code,p_level:Number(level),p_quantity:Number(quantity),p_price_points:Number(price),p_requested_enchant_code:wantQuantity==="0"?null:wantCode,p_requested_level:wantQuantity==="0"?null:Number(wantLevel),p_requested_quantity:Number(wantQuantity)});
  setBusy(false);setMessage(error?error.message:"Oferta wystawiona. Enchant został zabezpieczony do czasu sprzedaży lub anulowania.");
  if(!error)await load();
 }
 async function accept(id:string){
  if(!window.confirm("Kupić tę ofertę? Daily Points zostaną pobrane, a enchant trafi do Twojego ekwipunku."))return;
  setBusy(true);const {error}=await db.rpc("tm_accept_enchant_trade_offer",{p_offer_id:id});setBusy(false);
  setMessage(error?error.message:"Oferta kupiona.");if(!error)await load();
 }
 async function cancel(id:string){
  setBusy(true);const {error}=await db.rpc("tm_cancel_enchant_trade_offer",{p_offer_id:id});setBusy(false);
  setMessage(error?error.message:"Oferta anulowana, enchant wrócił do ekwipunku.");if(!error)await load();
 }
 const selected=inventory.find(x=>x.enchant_code===code&&x.level===Number(level));
 const maxLevel=code==="trapmaster"||code==="capybara"?0:code==="discount"?5:code==="premium"||code==="curiosity"?3:6;
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
  <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-emerald-300">TRAPMASTERS · MARKET</p><h1 className="mt-2 text-4xl font-black">Rynek enchantów</h1><p className="mt-2 text-white/60">Wystawiaj enchanty za Daily Points i kupuj oferty innych graczy.</p></header>
  {message&&<p role="status" className="mb-5 rounded-xl border border-white/10 bg-white/10 p-3">{message}</p>}
  <section className="mb-6 grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border border-emerald-400/20 bg-black/40 p-5"><p className="text-sm text-white/60">Twoje Daily Points</p><p className="mt-2 text-3xl font-black text-emerald-300">{balance.toLocaleString("pl-PL")}</p></article><article className="rounded-2xl border border-white/10 bg-black/40 p-5"><p className="text-sm text-white/60">Posiadane enchanty</p><p className="mt-2 text-3xl font-black">{inventory.reduce((n,x)=>n+x.quantity,0)}</p></article></section>
  <form onSubmit={createOffer} className="mb-8 grid gap-3 rounded-2xl border border-purple-400/20 bg-white/5 p-5"><h2 className="text-xl font-bold">Wystaw enchant</h2>
   <select className={fields} value={code} onChange={e=>{setCode(e.target.value);setLevel(e.target.value==="trapmaster"||e.target.value==="capybara"?"0":"1");}}>{Object.entries(names).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
   <select className={fields} value={level} onChange={e=>setLevel(e.target.value)}>{Array.from({length:maxLevel+1},(_,i)=>maxLevel===0?0:i+1).map(x=><option key={x} value={x}>{x===0?"Bez poziomu":"Poziom "+x}</option>)}</select>
   <p className="text-sm text-white/60">Dostępna ilość: {selected?.quantity??0}</p>
   <input className={fields} type="number" min="1" max={selected?.quantity??1} value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Ilość"/>
   <input className={fields} type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Cena w Daily Points (0 = bez punktów)"/>
   <h3 className="mt-2 font-semibold">Opcjonalnie: czego oczekujesz w zamian?</h3>
   <select className={fields} value={wantCode} onChange={e=>{setWantCode(e.target.value);setWantQuantity(e.target.value?"1":"0");}}><option value="">Tylko Daily Points</option>{Object.entries(names).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
   {wantCode&&<><input className={fields} type="number" min="0" max="6" value={wantLevel} onChange={e=>setWantLevel(e.target.value)} placeholder="Poziom wymaganego enchantu (0–6)"/><input className={fields} type="number" min="1" max="99" value={wantQuantity} onChange={e=>setWantQuantity(e.target.value)} placeholder="Ilość wymaganego enchantu"/></>}
   <p className="text-xs text-white/50">Możesz ustawić cenę w Daily Points, wymagać innego enchantu albo połączyć oba warunki.</p>
   <button disabled={busy||!userId||!selected||Number(quantity)>selected.quantity||Number(quantity)<1||Number(price)<0||(Number(price)===0&&Number(wantQuantity)===0)} className="rounded-xl bg-purple-600 px-5 py-3 font-bold disabled:opacity-40">{busy?"Przetwarzanie…":"Wystaw ofertę"}</button>
   {!inventory.length&&<p className="text-sm text-amber-200">Nie masz jeszcze enchantów w ekwipunku. Gdy system losowania zacznie przyznawać enchanty na konto, pojawią się tutaj do wystawienia.</p>}
  </form>
  <section className="rounded-2xl border border-white/10 bg-black/40 p-5"><h2 className="mb-4 text-xl font-bold">Aktywne oferty</h2><div className="space-y-3">{offers.map(o=><article key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><div><strong>{names[o.enchant_code]??o.enchant_code} {o.enchant_level?"· poziom "+o.enchant_level:""}</strong><p className="mt-1 text-sm text-white/60">Ilość: {o.quantity} · Sprzedający: {o.seller_id===userId?"Ty":o.seller_id.slice(0,8)}</p><p className="mt-1 text-sm text-emerald-300">{o.price_points.toLocaleString("pl-PL")} Daily Points{o.requested_enchant_code?" + "+(names[o.requested_enchant_code]??o.requested_enchant_code)+" poziom "+o.requested_enchant_level+" × "+o.requested_quantity:""}</p></div><div className="flex gap-2">{o.seller_id===userId?<button disabled={busy} onClick={()=>void cancel(o.id)} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Anuluj</button>:<button disabled={busy||!userId} onClick={()=>void accept(o.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold">Kup</button>}</div></article>)}{!offers.length&&<p className="text-white/50">Brak aktywnych ofert. Wystaw pierwszą!</p>}</div></section>
  <p className="mt-5 text-xs text-white/40">Transakcje są wykonywane atomowo po stronie bazy. Wystawiony enchant jest blokowany i wraca do właściciela po anulowaniu oferty.</p>
 </div></main>;
}
