"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Creator={id:string;user_id:string;account_nick:string|null;minecraft_username:string|null;bio:string;socials:Record<string,string>;avatar_url:string|null;created_at:string};
export default function CreatorsPage(){
 const [db]=useState(()=>typeof window==="undefined"?null as unknown as ReturnType<typeof createClient>:createClient());
 const [owner,setOwner]=useState(false);const [creator,setCreator]=useState(false);
 const [items,setItems]=useState<Creator[]>([]);const [names,setNames]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState<Creator|null>(null);
 const [accountNick,setAccountNick]=useState("");const [mcNick,setMcNick]=useState("");const [bio,setBio]=useState("");const [discord,setDiscord]=useState("");const [youtube,setYoutube]=useState("");const [other,setOther]=useState("");
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){
  const {data:auth}=await db.auth.getUser();
  const {data:list}=await db.rpc("tm_creator_directory");
  const creators=(list??[]) as Creator[];setItems(creators);
  if(!auth.user){setMessage("Zaloguj się, aby edytować profil.");return;}
  const [{data:o},{data:c}]=await Promise.all([
   db.rpc("tm_has_role",{p_roles:["owner"]}),
   db.rpc("tm_has_role",{p_roles:["trapcreator"]})
  ]);
  setOwner(o===true);setCreator(c===true);
  setNames(Object.fromEntries(creators.map(p=>[p.user_id,p.account_nick??"TrapCreator"])));
  const mine=creators.find(x=>x.user_id===auth.user.id);if(mine){setSelected(mine);setMcNick(mine.minecraft_username??"");setBio(mine.bio??"");setDiscord(mine.socials?.discord??"");setYoutube(mine.socials?.youtube??"");setOther(mine.socials?.other??"");}
 }
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void load();},[]);
 function choose(item:Creator){setSelected(item);setAccountNick(names[item.user_id]??"");setMcNick(item.minecraft_username??"");setBio(item.bio??"");setDiscord(item.socials?.discord??"");setYoutube(item.socials?.youtube??"");setOther(item.socials?.other??"");}
 async function save(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  const socials={discord:discord.trim(),youtube:youtube.trim(),other:other.trim()};
  const result=owner&&!selected
   ? await db.rpc("tm_upsert_creator_profile_by_nick",{p_account_nick:accountNick.trim(),p_minecraft_username:mcNick.trim(),p_bio:bio.trim(),p_socials:socials})
   : selected
    ? await db.from("creator_profiles").update({minecraft_username:mcNick.trim()||null,bio:bio.trim(),socials,updated_at:new Date().toISOString()}).eq("id",selected.id)
    : {error:{message:"Profil TrapCreator jest tworzony automatycznie po nadaniu rangi."}};
  setBusy(false);setMessage(result.error?.message??"Profil zapisany.");if(!result.error)await load();
 }
 const field="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white";
 return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
  <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · CREATORS</p><h1 className="mt-2 text-4xl font-black">TrapCreators</h1><p className="mt-2 text-white/60">Profile twórców i linki społecznościowe.</p></header>
  {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
  <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><button key={item.id} onClick={()=>choose(item)} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left"><div className="mb-3 flex items-center gap-3"><div className="h-14 w-14 rounded-xl bg-white/10 bg-cover bg-center" style={{backgroundImage:item.minecraft_username?"url(https://mc-heads.net/avatar/"+encodeURIComponent(item.minecraft_username)+"/64)":"none"}}/><div><strong>{names[item.user_id]??"TrapCreator"}</strong><p className="text-xs text-white/50">{item.minecraft_username??"Brak nicku Minecraft"}</p></div></div><p className="line-clamp-3 text-sm text-white/70">{item.bio}</p></button>)}</section>
  {owner&&<button type="button" onClick={()=>{setSelected(null);setAccountNick("");setMcNick("");setBio("");setDiscord("");setYoutube("");setOther("");}} className="mb-3 rounded-xl border border-white/15 px-4 py-2">Utwórz nowy profil TrapCreatora</button>}
  {(creator||owner)&&<form onSubmit={save} className="grid gap-3 rounded-2xl border border-purple-400/20 bg-white/5 p-6"><h2 className="text-xl font-bold">{selected?"Edytuj profil":"Utwórz profil twórcy"}</h2>{owner&&!selected&&<input className={field} required placeholder="Nick konta (z profilu)" value={accountNick} onChange={e=>setAccountNick(e.target.value)}/>}<input className={field} placeholder="Nick Minecraft" value={mcNick} onChange={e=>setMcNick(e.target.value)}/><textarea className={field} rows={4} maxLength={500} placeholder="Krótki opis" value={bio} onChange={e=>setBio(e.target.value)}/><input className={field} placeholder="Discord (link lub nazwa)" value={discord} onChange={e=>setDiscord(e.target.value)}/><input className={field} placeholder="YouTube (link)" value={youtube} onChange={e=>setYoutube(e.target.value)}/><input className={field} placeholder="Inne social media" value={other} onChange={e=>setOther(e.target.value)}/><button disabled={busy} className="rounded-xl bg-purple-600 px-5 py-3 font-bold">{busy?"Zapisywanie…":"Zapisz profil"}</button></form>}
  <p className="mt-6 text-sm text-white/50">Chcesz zostać TrapCreatorem? Otwórz ticket na naszym Discordzie i zgłoś swoją kandydaturę!</p>
 </div></main>;
}
