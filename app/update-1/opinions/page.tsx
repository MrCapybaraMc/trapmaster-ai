"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Opinion={id:string;user_id:string;body:string;created_at:string;updated_at:string};
export default function OpinionsPage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [userId,setUserId]=useState("");const [allowed,setAllowed]=useState(false);
 const [items,setItems]=useState<Opinion[]>([]);const [body,setBody]=useState("");const [editing,setEditing]=useState("");
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){
  const {data:auth}=await db.auth.getUser();if(!auth.user){setMessage("Zaloguj się, aby zobaczyć opinie.");return;}setUserId(auth.user.id);
  const {data:access}=await db.rpc("has_trapmaster_access");setAllowed(access===true);
  const {data,error}=await db.from("tm_opinions").select("*").order("created_at",{ascending:false});
  if(error)setMessage(error.message);else setItems((data??[]) as Opinion[]);
 }
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();},[]);
 async function save(e:FormEvent){e.preventDefault();setBusy(true);
  const result=editing?await db.from("tm_opinions").update({body:body.trim(),updated_at:new Date().toISOString()}).eq("id",editing):await db.from("tm_opinions").insert({user_id:userId,body:body.trim()});
  setBusy(false);setMessage(result.error?result.error.message:"Opinia zapisana.");if(!result.error){setBody("");setEditing("");await load();}
 }
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-4xl">
  <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · OPINIONS</p><h1 className="mt-2 text-4xl font-black">Opinie</h1><p className="mt-2 text-white/60">Opinie pozostają widoczne także po wygaśnięciu pakietu.</p></header>
  {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
  {allowed&&<form onSubmit={save} className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="font-bold">{editing?"Edytuj swoją opinię":"Dodaj opinię"}</h2><textarea className="w-full rounded-xl border border-white/10 bg-black/30 p-4" rows={5} minLength={3} maxLength={3000} required value={body} onChange={e=>setBody(e.target.value)} placeholder="Podziel się opinią o TrapMasters…"/><div className="flex gap-2"><button disabled={busy} className="rounded-xl bg-purple-600 px-5 py-3 font-bold">{busy?"Zapisywanie…":"Zapisz opinię"}</button>{editing&&<button type="button" onClick={()=>{setEditing("");setBody("");}} className="rounded-xl bg-white/10 px-4">Anuluj</button>}</div></form>}
  {!allowed&&userId&&<p className="mb-5 rounded-xl bg-white/5 p-4 text-sm text-white/60">Dodawanie i edycja opinii wymaga aktywnego pakietu TrapMasters. Wcześniejsze opinie pozostają dostępne.</p>}
  <section className="space-y-3">{items.map(item=><article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.user_id===userId?"Twoja opinia":"Użytkownik TrapMasters"}</strong><time className="text-xs text-white/40">{new Date(item.created_at).toLocaleDateString("pl-PL")}</time></div><p className="mt-3 whitespace-pre-wrap">{item.body}</p>{item.user_id===userId&&allowed&&<button onClick={()=>{setEditing(item.id);setBody(item.body);window.scrollTo({top:0,behavior:"smooth"});}} className="mt-3 text-sm text-purple-300">Edytuj</button>}</article>)}{!items.length&&<p className="rounded-xl bg-white/5 p-6 text-white/50">Brak opinii.</p>}</section>
 </div></main>;
}
