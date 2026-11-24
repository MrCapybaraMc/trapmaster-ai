"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Partner={id:string;name:string;description:string;image_url:string|null;website_url:string|null;created_at:string};
export default function PartnersPage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [items,setItems]=useState<Partner[]>([]);const [message,setMessage]=useState("");
 async function load(){const {data,error}=await db.from("tm_partners").select("id,name,description,image_url,website_url,created_at").eq("active",true).order("created_at",{ascending:false});if(error)setMessage(error.message);else setItems((data??[]) as Partner[]);}
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();},[]);
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl"><header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · PARTNERS</p><h1 className="mt-2 text-4xl font-black">Partnerstwa</h1><p className="mt-2 text-white/60">Serwery, projekty i twórcy współpracujący z TrapMasters.</p></header>{message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">{item.image_url&&<div className="h-40 bg-cover bg-center" style={{backgroundImage:"url("+item.image_url+")"}}/>}<div className="p-5"><h2 className="text-xl font-bold">{item.name}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{item.description}</p>{item.website_url&&<a href={item.website_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold">Odwiedź</a>}</div></article>)}</section>{!items.length&&<p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-white/50">Partnerstwa pojawią się tutaj.</p>}</div></main>;
}
