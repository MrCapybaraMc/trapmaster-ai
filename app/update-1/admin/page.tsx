"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Staff = {user_id:string;email:string;role:string;granted_at:string};
type Row = {id:string;title?:string;name?:string;description?:string;starts_at?:string;created_at:string;status?:string;contact_email?:string;applicant_type?:string};
export default function UpdateAdminPage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [roles,setRoles]=useState<string[]>([]);
 const [tab,setTab]=useState("overview");
 const [staff,setStaff]=useState<Staff[]>([]);
 const [stats,setStats]=useState<Record<string,number>>({});
 const [events,setEvents]=useState<Row[]>([]);
 const [partners,setPartners]=useState<Row[]>([]);
 const [applications,setApplications]=useState<Row[]>([]);
 const [email,setEmail]=useState("");const [role,setRole]=useState("trapcreator");
 const [eventTitle,setEventTitle]=useState("");const [eventDesc,setEventDesc]=useState("");const [eventDate,setEventDate]=useState("");
 const [partnerName,setPartnerName]=useState("");const [partnerDesc,setPartnerDesc]=useState("");const [partnerUrl,setPartnerUrl]=useState("");const [partnerImage,setPartnerImage]=useState("");
 const [announcementTitle,setAnnouncementTitle]=useState("");const [announcementBody,setAnnouncementBody]=useState("");
 const [recipient,setRecipient]=useState("");const [prices,setPrices]=useState('{"day":2,"week":5,"month":12,"forever":28}');
 const [code,setCode]=useState("");const [rewards,setRewards]=useState('[{"type":"daily_points","amount":300}]');const [expiry,setExpiry]=useState("");const [maxUses,setMaxUses]=useState("");
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 const owner=roles.includes("owner");const head=roles.includes("headadmin");
 async function load(){
  const {data:auth}=await db.auth.getUser();if(!auth.user){setMessage("Zaloguj się.");return;}
  const {data:r,error:roleError}=await db.from("user_roles").select("role").eq("user_id",auth.user.id);
  if(roleError){setMessage(roleError.message);return;}
  const current=(r??[]).map((x:{role:string})=>x.role);setRoles(current);
  if(!current.some(x=>["admin","headadmin","owner"].includes(x))){setMessage("Brak dostępu do panelu.");return;}
  const [{data:s},{data:overview},{data:e},{data:p},{data:a},{data:store}]=await Promise.all([
   (owner||head)?db.rpc("tm_list_staff_roles") : Promise.resolve({data:[]}),
   db.rpc("tm_admin_overview"),
   db.from("tm_events").select("*").order("starts_at"),
   db.from("tm_partners").select("*").order("created_at",{ascending:false}),
   db.from("collaboration_applications").select("*").order("created_at",{ascending:false}),
   owner?db.from("tm_store_settings").select("*").eq("id",true).maybeSingle():Promise.resolve({data:null})
  ]);
  setStaff((s??[]) as Staff[]);setStats((overview??{}) as Record<string,number>);setEvents((e??[]) as Row[]);setPartners((p??[]) as Row[]);setApplications((a??[]) as Row[]);
  if(store){setRecipient(store.minecraft_payment_recipient??"");setPrices(JSON.stringify(store.package_prices??{},null,2));}
 }
 useEffect(()=>{void load();},[]);
 async function run(action:()=>Promise<{error:{message:string}|null}>){
  setBusy(true);const result=await action();setBusy(false);setMessage(result.error?.message??"Zapisano.");if(!result.error)await load();
 }
 async function roleAction(e:FormEvent,grant:boolean){
  e.preventDefault();await run(()=>db.rpc(grant?"tm_grant_role_by_email":"tm_revoke_role_by_email",{p_email:email.trim(),p_role:role}));
 }
 async function addEvent(e:FormEvent){e.preventDefault();await run(()=>db.from("tm_events").insert({title:eventTitle,description:eventDesc,starts_at:new Date(eventDate).toISOString(),created_by:null}));setEventTitle("");setEventDesc("");}
 async function addPartner(e:FormEvent){e.preventDefault();await run(()=>db.from("tm_partners").insert({name:partnerName,description:partnerDesc,website_url:partnerUrl||null,image_url:partnerImage||null,created_by:null}));setPartnerName("");setPartnerDesc("");}
 async function addAnnouncement(e:FormEvent){e.preventDefault();const {data:u}=await db.auth.getUser();await run(()=>db.from("tm_announcements").insert({title:announcementTitle,body:announcementBody,created_by:u.user?.id}));setAnnouncementTitle("");setAnnouncementBody("");}
 async function saveStore(e:FormEvent){e.preventDefault();let parsed:unknown;try{parsed=JSON.parse(prices);if(!parsed||typeof parsed!=="object")throw new Error();}catch{setMessage("Cennik musi być poprawnym obiektem JSON.");return;}const {data:u}=await db.auth.getUser();await run(()=>db.from("tm_store_settings").upsert({id:true,minecraft_payment_recipient:recipient,package_prices:parsed,updated_by:u.user?.id,updated_at:new Date().toISOString()},{onConflict:"id"}));}
 async function addCombo(e:FormEvent){e.preventDefault();let rewardData:unknown;try{rewardData=JSON.parse(rewards);if(!Array.isArray(rewardData))throw new Error();}catch{setMessage("Nagrody muszą być tablicą JSON.");return;}const {data:u}=await db.auth.getUser();await run(()=>db.from("tm_supercombo_codes").insert({code:code.trim().toUpperCase(),rewards:rewardData,expires_at:expiry?new Date(expiry).toISOString():null,max_uses:maxUses?Number(maxUses):null,created_by:u.user?.id}));setCode("");}
 const field="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white";
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
  <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · UPDATE 1.0</p><h1 className="mt-2 text-4xl font-black">Panel administracyjny beta</h1><p className="mt-2 text-white/60">Zarządzanie funkcjami wyłącznie w bazie testowej.</p></header>
  {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
  <nav className="mb-6 flex flex-wrap gap-2">{[["overview","Statystyki"],["roles","Rangi"],["events","Wydarzenia"],["partners","Partnerstwa"],["collabs","Współprace"],["store","/Pay"],["combo","SuperCombo"],["announcements","Ogłoszenia"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`rounded-xl px-3 py-2 text-sm font-bold ${tab===k?"bg-purple-600":"bg-white/10"}`}>{l}</button>)}</nav>
  {tab==="overview"&&<section className="grid gap-3 sm:grid-cols-3">{Object.entries(stats).map(([k,v])=><article key={k} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-white/50">{k.replaceAll("_"," ")}</p><p className="mt-2 text-3xl font-black">{v}</p></article>)}</section>}
  {tab==="roles"&&(owner||head)&&<section className="space-y-5"><form onSubmit={e=>void roleAction(e,true)} className="grid gap-3 rounded-2xl bg-white/5 p-5 sm:grid-cols-[1fr_180px_auto]"><input className={field} required type="email" placeholder="E-mail konta" value={email} onChange={e=>setEmail(e.target.value)}/><select className={field} value={role} onChange={e=>setRole(e.target.value)}>{["admin","headadmin","trapcreator","trapmasters"].filter(r=>owner||r!=="headadmin").map(r=><option key={r}>{r}</option>)}</select><button disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold">Nadaj rangę</button></form><form onSubmit={e=>void roleAction(e,false)} className="grid gap-3 rounded-2xl bg-white/5 p-5 sm:grid-cols-[1fr_180px_auto]"><input className={field} required type="email" placeholder="E-mail konta do odebrania rangi" value={email} onChange={e=>setEmail(e.target.value)}/><select className={field} value={role} onChange={e=>setRole(e.target.value)}>{["admin","headadmin","trapcreator","trapmasters"].filter(r=>owner||r==="admin").map(r=><option key={r}>{r}</option>)}</select><button disabled={busy} className="rounded-xl bg-red-700 px-4 py-3 font-bold">Odbierz rangę</button></form><div className="space-y-2">{staff.map(s=><article key={s.user_id+s.role} className="flex flex-wrap justify-between rounded-xl bg-white/5 p-3"><span>{s.email}</span><strong>{s.role}</strong></article>)}</div></section>}
  {tab==="events"&&(owner||head)&&<section className="space-y-4"><form onSubmit={e=>void addEvent(e)} className="grid gap-3 rounded-2xl bg-white/5 p-5"><h2 className="font-bold">Dodaj wydarzenie</h2><input className={field} required placeholder="Nazwa" value={eventTitle} onChange={e=>setEventTitle(e.target.value)}/><textarea className={field} placeholder="Opis" value={eventDesc} onChange={e=>setEventDesc(e.target.value)}/><input className={field} required type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)}/><button className="rounded-xl bg-purple-600 px-4 py-3 font-bold">Dodaj wydarzenie</button></form>{events.map(x=><article key={x.id} className="rounded-xl bg-white/5 p-4"><strong>{x.title}</strong><p>{x.description}</p><p className="text-sm text-white/50">{x.starts_at}</p><button onClick={()=>void run(()=>db.from("tm_events").update({active:false}).eq("id",x.id))} className="mt-2 text-sm text-red-300">Zakończ / ukryj</button></article>)}</section>}
  {tab==="partners"&&(owner||head)&&<section className="space-y-4"><form onSubmit={e=>void addPartner(e)} className="grid gap-3 rounded-2xl bg-white/5 p-5"><h2 className="font-bold">Dodaj partnera</h2><input className={field} required placeholder="Nazwa" value={partnerName} onChange={e=>setPartnerName(e.target.value)}/><textarea className={field} placeholder="Opis" value={partnerDesc} onChange={e=>setPartnerDesc(e.target.value)}/><input className={field} type="url" placeholder="Link" value={partnerUrl} onChange={e=>setPartnerUrl(e.target.value)}/><input className={field} type="url" placeholder="Link do obrazu (opcjonalnie)" value={partnerImage} onChange={e=>setPartnerImage(e.target.value)}/><button className="rounded-xl bg-purple-600 px-4 py-3 font-bold">Dodaj</button></form>{partners.map(x=><article key={x.id} className="rounded-xl bg-white/5 p-4"><strong>{x.name}</strong><p>{x.description}</p><button onClick={()=>void run(()=>db.from("tm_partners").update({active:false}).eq("id",x.id))} className="mt-2 text-sm text-red-300">Ukryj</button></article>)}</section>}
  {tab==="collabs"&&(owner||head)&&<section className="space-y-3">{applications.map(x=><article key={x.id} className="rounded-xl bg-white/5 p-4"><strong>{x.applicant_type} · {x.contact_email}</strong><p className="mt-1">{x.description??x.reason}</p><p className="text-xs text-white/50">{x.status}</p><div className="mt-3 flex gap-2"><button onClick={()=>void run(()=>db.from("collaboration_applications").update({status:"reviewing"}).eq("id",x.id))} className="rounded-lg bg-white/10 px-3 py-2">W trakcie</button><button onClick={()=>void run(()=>db.from("collaboration_applications").update({status:"accepted"}).eq("id",x.id))} className="rounded-lg bg-emerald-700 px-3 py-2">Akceptuj</button><button onClick={()=>void run(()=>db.from("collaboration_applications").update({status:"rejected"}).eq("id",x.id))} className="rounded-lg bg-red-800 px-3 py-2">Odrzuć</button></div></article>)}</section>}
  {tab==="store"&&owner&&<form onSubmit={e=>void saveStore(e)} className="grid gap-3 rounded-2xl bg-white/5 p-5"><h2 className="font-bold">Ustawienia płatności</h2><input className={field} placeholder="Nick odbiorcy Minecraft" value={recipient} onChange={e=>setRecipient(e.target.value)}/><label className="text-sm text-white/60">Cennik pakietów (JSON)</label><textarea className={field} rows={7} value={prices} onChange={e=>setPrices(e.target.value)}/><button className="rounded-xl bg-purple-600 px-4 py-3 font-bold">Zapisz cennik</button></form>}
  {tab==="combo"&&owner&&<form onSubmit={e=>void addCombo(e)} className="grid gap-3 rounded-2xl bg-white/5 p-5"><h2 className="font-bold">Utwórz kod SuperCombo</h2><input className={field} required placeholder="KOD" value={code} onChange={e=>setCode(e.target.value)}/><textarea className={field} rows={5} value={rewards} onChange={e=>setRewards(e.target.value)}/><input className={field} type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)}/><input className={field} type="number" min="1" placeholder="Limit użyć (puste = bez limitu)" value={maxUses} onChange={e=>setMaxUses(e.target.value)}/><button className="rounded-xl bg-purple-600 px-4 py-3 font-bold">Utwórz kod</button></form>}
  {tab==="announcements"&&owner&&<form onSubmit={e=>void addAnnouncement(e)} className="grid gap-3 rounded-2xl bg-white/5 p-5"><h2 className="font-bold">Dodaj ogłoszenie</h2><input className={field} required placeholder="Tytuł" value={announcementTitle} onChange={e=>setAnnouncementTitle(e.target.value)}/><textarea className={field} required rows={5} placeholder="Treść ogłoszenia" value={announcementBody} onChange={e=>setAnnouncementBody(e.target.value)}/><button className="rounded-xl bg-purple-600 px-4 py-3 font-bold">Opublikuj</button></form>}
  {!owner&&!head&&!roles.includes("admin")&&<p>Brak uprawnień.</p>}
 </div></main>;
}
