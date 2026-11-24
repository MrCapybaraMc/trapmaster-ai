"use client";

import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EventItem={id:string;title:string;description:string;starts_at:string};
export default function UpdateOneLayout({children}:{children:ReactNode}){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [event,setEvent]=useState<EventItem|null>(null);
 const [now,setNow]=useState(0);
 const [dismissed,setDismissed]=useState(false);
 const [language,setLanguage]=useState("pl");
 useEffect(()=>{
  let active=true;
  async function load(){
   const {data:auth}=await db.auth.getUser();
   const [{data:events},{data:settings}]=await Promise.all([
    db.from("tm_events").select("id,title,description,starts_at").eq("active",true).order("starts_at",{ascending:true}).limit(10),
    auth.user?db.from("tm_user_settings").select("language").eq("user_id",auth.user.id).maybeSingle():Promise.resolve({data:null})
   ]);
   if(!active)return;
   if(settings?.language)setLanguage(settings.language);
   const list=(events??[]) as EventItem[];
   if(auth.user&&list.length){
    const {data:closed}=await db.from("tm_event_dismissals").select("event_id").eq("user_id",auth.user.id).in("event_id",list.map(x=>x.id));
    const hidden=new Set((closed??[]).map((x:{event_id:string})=>x.event_id));
    setEvent(list.find(x=>!hidden.has(x.id))??null);
   }else setEvent(list[0]??null);
  }
  void load();
  const tick=window.setInterval(()=>setNow(Date.now()),1000);
  return ()=>{active=false;window.clearInterval(tick);};
 },[db]);
 async function dismiss(){
  if(!event)return;
  const {data:auth}=await db.auth.getUser();
  if(auth.user)await db.from("tm_event_dismissals").insert({event_id:event.id,user_id:auth.user.id});
  setDismissed(true);setEvent(null);
 }
 async function changeLanguage(next:string){
  setLanguage(next);document.documentElement.lang=next;
  const {data:auth}=await db.auth.getUser();
  if(auth.user)await db.from("tm_user_settings").upsert({user_id:auth.user.id,language:next},{onConflict:"user_id"});
  window.dispatchEvent(new CustomEvent("trapmasters-language-change",{detail:next}));
 }
 const remaining=event?new Date(event.starts_at).getTime()-now:0;
 const countdown=remaining<=0?"Wydarzenie rozpoczęte":`${Math.floor(remaining/86400000)}d ${Math.floor(remaining%86400000/3600000)}h ${Math.floor(remaining%3600000/60000)}m ${Math.floor(remaining%60000/1000)}s`;
 return <>{event&&!dismissed&&<aside className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-purple-300/20 bg-[#24113e] px-4 py-3 text-white"><div><strong>{event.title}</strong><span className="ml-3 text-sm text-purple-100">{countdown}</span>{event.description&&<p className="text-xs text-white/70">{event.description}</p>}</div><button onClick={()=>void dismiss()} aria-label="Ukryj wydarzenie" className="rounded-lg bg-white/10 px-3 py-1">×</button></aside>}
 <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1 rounded-xl border border-white/15 bg-black/75 p-1 text-xs text-white backdrop-blur"><button onClick={()=>void changeLanguage("pl")} className={`rounded-lg px-2 py-1 ${language==="pl"?"bg-purple-600":""}`}>PL</button><button onClick={()=>void changeLanguage("en")} className={`rounded-lg px-2 py-1 ${language==="en"?"bg-purple-600":""}`}>EN</button></div>
 {children}</>;
}
