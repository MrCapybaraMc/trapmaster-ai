"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = { id: number; user_id: string; body: string; created_at: string };
type Notice = { id: string; title: string; body: string; href: string | null; read_at: string | null; created_at: string };

export default function CommunityPage() {
  const [db] = useState(() => createClient());
  const [userId, setUserId] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [tab, setTab] = useState("trap");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [proposalUrl, setProposalUrl] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [chatBody, setChatBody] = useState("");
  const [collabType, setCollabType] = useState("creator");
  const [collabReason, setCollabReason] = useState("");
  const [platforms, setPlatforms] = useState("");
  const [audience, setAudience] = useState("");
  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) { setMessage("Zaloguj się, aby korzystać ze społeczności."); return; }
    setUserId(auth.user.id);
    const { data: roleData } = await db.from("user_roles").select("role").eq("user_id", auth.user.id);
    setRoles((roleData ?? []).map((x: {role:string}) => x.role));
    const { data: n } = await db.from("tm_notifications").select("*").order("created_at", { ascending: false }).limit(30);
    setNotices((n ?? []) as Notice[]);
    if ((roleData ?? []).some((x: {role:string}) => ["trapcreator","owner"].includes(x.role))) {
      const { data: messages } = await db.from("creator_chat_messages").select("*").order("created_at", { ascending: true }).limit(100);
      setChat((messages ?? []) as ChatMessage[]);
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent, kind: string) {
    event.preventDefault(); setBusy(true); setMessage("");
    let error: {message:string} | null = null;
    if (kind === "trap") {
      const result = await db.from("trap_proposals").insert({ user_id:userId, youtube_url:proposalUrl.trim() || null, description:proposalDescription.trim() });
      error = result.error;
      if (!error) { setProposalUrl(""); setProposalDescription(""); }
    } else if (kind === "site") {
      const result = await db.from("site_proposals").insert({ user_id:userId, title:siteTitle.trim(), description:siteDescription.trim() });
      error = result.error;
      if (!error) { setSiteTitle(""); setSiteDescription(""); }
    } else if (kind === "collab") {
      const result = await db.from("collaboration_applications").insert({
        user_id:userId, applicant_type:collabType, reason:collabReason.trim(),
        platforms:platforms.split(",").map(x=>x.trim()).filter(Boolean),
        audience_size:audience.trim() || null, contact_email:email.trim(), extra_info:extra.trim()
      });
      error = result.error;
      if (!error) { setCollabReason(""); setPlatforms(""); setAudience(""); setEmail(""); setExtra(""); }
    } else if (kind === "chat") {
      const result = await db.from("creator_chat_messages").insert({ user_id:userId, body:chatBody.trim() });
      error = result.error;
      if (!error) { setChatBody(""); await refresh(); }
    }
    setBusy(false); setMessage(error ? error.message : "Zapisano. Dziękujemy!");
  }

  async function markRead(id: string) {
    const { error } = await db.from("tm_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (!error) setNotices(items=>items.map(item=>item.id===id?{...item,read_at:new Date().toISOString()}:item));
  }

  const field = "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white";
  const isCreator = roles.includes("trapcreator") || roles.includes("owner");
  return <main className="min-h-screen bg-[#080812] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-5xl">
    <header className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-purple-300">TRAPMASTERS · COMMUNITY</p><h1 className="mt-2 text-4xl font-black">Społeczność</h1><p className="mt-2 text-white/60">Propozycje, współpraca, wiadomości i powiadomienia.</p></header>
    {message&&<p role="status" className="mb-4 rounded-xl bg-white/10 p-3">{message}</p>}
    <nav className="mb-6 flex flex-wrap gap-2">{[["trap","Propozycja trapa"],["site","Propozycja strony"],["collab","Współpraca"],["chat","Czat twórców"],["notices","Powiadomienia"]].map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab===key?"bg-purple-600":"bg-white/10"}`}>{label}</button>)}</nav>
    {tab==="trap"&&<form onSubmit={e=>void submit(e,"trap")} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-bold">Złóż propozycję trapa</h2><p className="text-sm text-white/60">Dla kont z dostępem TrapMasters. Możesz podać film YouTube lub opisać pomysł.</p><input className={field} type="url" placeholder="Link do filmu YouTube (opcjonalnie)" value={proposalUrl} onChange={e=>setProposalUrl(e.target.value)}/><textarea className={field} required rows={5} placeholder="Opisz trap lub swój pomysł" value={proposalDescription} onChange={e=>setProposalDescription(e.target.value)}/><button disabled={busy||!userId} className="rounded-xl bg-purple-600 px-5 py-3 font-bold disabled:opacity-50">Wyślij propozycję</button></form>}
    {tab==="site"&&<form onSubmit={e=>void submit(e,"site")} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-bold">Propozycja dla strony</h2><input className={field} required placeholder="Tytuł pomysłu" value={siteTitle} onChange={e=>setSiteTitle(e.target.value)}/><textarea className={field} required rows={5} placeholder="Co warto dodać lub zmienić?" value={siteDescription} onChange={e=>setSiteDescription(e.target.value)}/><button disabled={busy||!userId} className="rounded-xl bg-purple-600 px-5 py-3 font-bold">Wyślij</button></form>}
    {tab==="collab"&&<form onSubmit={e=>void submit(e,"collab")} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-bold">Chcesz współpracę?</h2><select className={field} value={collabType} onChange={e=>setCollabType(e.target.value)}><option value="creator">Twórca</option><option value="project">Projekt</option><option value="server">Serwer Minecraft</option></select><textarea className={field} required placeholder="Dlaczego chcesz współpracować?" value={collabReason} onChange={e=>setCollabReason(e.target.value)}/><input className={field} placeholder="Platformy (oddziel przecinkami)" value={platforms} onChange={e=>setPlatforms(e.target.value)}/><input className={field} placeholder="Obserwujący / subskrybenci" value={audience} onChange={e=>setAudience(e.target.value)}/><input className={field} required type="email" placeholder="Kontaktowy e-mail" value={email} onChange={e=>setEmail(e.target.value)}/><textarea className={field} placeholder="Dodatkowe informacje" value={extra} onChange={e=>setExtra(e.target.value)}/><button disabled={busy||!userId} className="rounded-xl bg-purple-600 px-5 py-3 font-bold">Wyślij zgłoszenie</button></form>}
    {tab==="chat"&&(isCreator?<section className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="mb-4 text-xl font-bold">Czat TrapCreatorów</h2><div className="mb-4 max-h-[50vh] space-y-3 overflow-y-auto">{chat.map(item=><article key={item.id} className="rounded-xl bg-black/30 p-3"><p className="text-xs text-purple-300">{item.user_id===userId?"Ty":item.user_id.slice(0,8)} · {new Date(item.created_at).toLocaleString("pl-PL")}</p><p className="mt-1 whitespace-pre-wrap">{item.body}</p></article>)}{!chat.length&&<p className="text-white/50">Brak wiadomości.</p>}</div><form onSubmit={e=>void submit(e,"chat")} className="flex flex-col gap-2 sm:flex-row"><input className={field} required maxLength={4000} placeholder="Napisz wiadomość…" value={chatBody} onChange={e=>setChatBody(e.target.value)}/><button disabled={busy} className="rounded-xl bg-purple-600 px-5 py-3 font-bold">Wyślij</button></form></section>:<p className="rounded-xl bg-white/5 p-6">Czat jest dostępny tylko dla TrapCreatorów.</p>)}
    {tab==="notices"&&<section className="space-y-3">{notices.map(n=><article key={n.id} className={`rounded-xl border p-4 ${n.read_at?"border-white/10 bg-white/5":"border-purple-400/30 bg-purple-500/10"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{n.title}</h3><p className="mt-1 text-sm text-white/70">{n.body}</p><p className="mt-2 text-xs text-white/40">{new Date(n.created_at).toLocaleString("pl-PL")}</p></div>{!n.read_at&&<button onClick={()=>void markRead(n.id)} className="text-xs text-purple-200">Oznacz jako przeczytane</button>}</div></article>)}{!notices.length&&<p className="rounded-xl bg-white/5 p-6 text-white/50">Brak powiadomień.</p>}</section>}
    <p className="mt-8 text-xs text-white/40">Rekrutacja na TrapCreatora: Chcesz zostać TrapCreatorem? Otwórz ticket na naszym Discordzie i zgłoś swoją kandydaturę!</p>
  </div></main>;
}
