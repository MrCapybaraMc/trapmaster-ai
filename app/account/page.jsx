"use client";

// Keep this file as plain JSX: do not add TypeScript generic annotations here.

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setUser(null); setLoading(false); return; }
    setUser(auth.user);
    const [{ data: profileData }, { data: orderData }] = await Promise.all([
      supabase.from("profiles").select("user_id,nickname,avatar_url,points,daily_streak,last_daily_claim").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("orders").select("id,minecraft_nick,package_type,price_m,status,created_at,expires_at").order("created_at", { ascending: false })
    ]);
    setProfile(profileData);
    setNickname(profileData?.nickname || auth.user.user_metadata?.minecraft_nick || "");
    setOrders(orderData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  async function saveProfile(e) {
    e.preventDefault();
    const clean = nickname.trim();
    if (clean.length < 1 || clean.length > 32) { setMessage("Nick musi mieć od 1 do 32 znaków."); return; }
    setSaving(true); setMessage("");
    const { error } = await supabase.from("profiles").update({ nickname: clean, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (error) setMessage(error.message);
    else { setMessage("Profil został zapisany."); await refresh(); }
    setSaving(false);
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setMessage("Wybierz PNG, JPG lub WEBP do 3 MB."); return;
    }
    setUploading(true); setMessage("");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = user.id + "/avatar." + ext;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setMessage(uploadError.message); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = data.publicUrl + "?v=" + Date.now();
    const { error } = await supabase.from("profiles").update({ nickname: nickname.trim() || profile?.nickname || "Gracz", avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    setMessage(error ? error.message : "Zdjęcie profilowe zostało zmienione.");
    await refresh(); setUploading(false); e.target.value = "";
  }

  async function claimDaily() {
    setBusy(true); setMessage("");
    const { data, error } = await supabase.rpc("claim_daily_reward");
    if (error) setMessage(error.message);
    else {
      const result = Array.isArray(data) ? data[0] : data;
      setMessage("Odebrano " + result.points_awarded + " punktów! Seria: " + result.streak_days + " dni.");
      await refresh();
    }
    setBusy(false);
  }

  async function redeemAccess() {
    if (!window.confirm("Wymienić 2150 punktów na 24 godziny dostępu TrapMaster?")) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.rpc("redeem_daily_access");
    if (error) setMessage(error.message);
    else { setMessage("Wymieniono punkty! Dostęp aktywny do: " + new Date(data.expires_at).toLocaleString("pl-PL")); await refresh(); }
    setBusy(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <main className="min-h-screen bg-[#070910] text-white grid place-items-center">Ładowanie konta...</main>;
  if (!user) return <main className="min-h-screen bg-[#070910] text-white grid place-items-center p-5"><div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center"><h1 className="text-3xl font-black">Moje konto</h1><p className="mt-4 text-gray-400">Zaloguj się, aby zobaczyć swój profil.</p><a href="/register" className="mt-6 inline-block rounded-xl bg-purple-600 px-7 py-3 font-bold">ZALOGUJ SIĘ</a></div></main>;

  const canClaim = profile?.last_daily_claim !== new Date().toISOString().slice(0,10);
  const balance = profile?.points ?? 0;

  return (
    <main className="min-h-screen bg-[#070910] px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-7">
          <div><a href="/" className="text-xl font-black">TRAP<span className="text-purple-400">MASTERS</span></a><h1 className="mt-4 text-4xl font-black">Moje konto</h1><p className="mt-2 text-gray-400">Twój profil, Daily i historia zamówień.</p></div>
          <button onClick={handleSignOut} className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-bold text-red-300">Wyloguj się</button>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-950/60 to-[#10121d] p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-5">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-2xl border border-white/15 object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-2xl bg-purple-900 text-4xl">👤</div>}
              <div><p className="text-xs font-bold uppercase tracking-[.25em] text-purple-300">Profil gracza</p><h2 className="mt-2 text-2xl font-black">{profile?.nickname || "Gracz"}</h2><p className="mt-1 text-sm text-white/50">{user.email}</p></div>
            </div>
            <form onSubmit={saveProfile} className="mt-7 space-y-3">
              <label className="block text-sm font-semibold text-gray-300">Nick / nazwa wyświetlana<input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={32} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-purple-400" placeholder="Twój nick" /></label>
              <div className="flex flex-wrap gap-3"><button disabled={saving} className="rounded-xl bg-purple-600 px-5 py-3 font-bold disabled:opacity-50">{saving ? "Zapisywanie..." : "Zapisz nick"}</button><label className="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold">{uploading ? "Wysyłanie..." : "Zmień avatar"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} disabled={uploading} className="hidden" /></label></div>
              <p className="text-xs text-white/40">PNG, JPG lub WEBP • maks. 3 MB</p>
            </form>
          </div>

          <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-950/40 to-[#11131c] p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">Daily rewards</p>
            <div className="mt-3 flex items-end gap-2"><span className="text-5xl font-black tabular-nums">{balance}</span><span className="pb-1 text-white/50">punktów</span></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-black/25 p-4"><p className="text-xs text-white/50">Seria logowań</p><p className="mt-1 text-2xl font-black">{profile?.daily_streak || 0} dni</p></div><div className="rounded-xl bg-black/25 p-4"><p className="text-xs text-white/50">Dzisiejsza nagroda</p><p className="mt-1 text-2xl font-black">{(profile?.daily_streak || 0) >= 13 ? "150" : (profile?.daily_streak || 0) >= 4 ? "100" : "50"} pkt</p></div></div>
            <button onClick={claimDaily} disabled={busy || !canClaim} className="mt-5 w-full rounded-xl bg-amber-400 px-5 py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-40">{canClaim ? "ODBIERZ DZIENNĄ NAGRODĘ" : "NAGRODA ODEBRANA DZISIAJ"}</button>
            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/65"><p>1–4 dni: 50 pkt/dzień</p><p>5–13 dni: 100 pkt/dzień</p><p>Od 14. dnia: 150 pkt/dzień</p></div>
            <button onClick={redeemAccess} disabled={busy || balance < 2150} className="mt-4 w-full rounded-xl border border-purple-300/30 bg-purple-600/20 px-5 py-4 font-bold text-purple-100 disabled:opacity-40">Wymień 2150 pkt na 24h TrapMaster</button>
            <p className="mt-2 text-xs text-white/40">Przy regularnym odbieraniu nagród próg można osiągnąć w około 20 dni.</p>
          </div>
        </section>

        {message && <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">{message}</p>}

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-3xl font-black">Moje zamówienia</h2><p className="mt-2 text-gray-400">Historia zakupów i status dostępu.</p></div><span className="text-sm text-white/50">{orders.length} zamówień</span></div>
          {orders.length === 0 ? <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-7 text-gray-400">Nie masz jeszcze zamówień.</p> : <div className="mt-6 space-y-3">{orders.map(order=><article key={order.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"><div><h3 className="font-bold">{order.minecraft_nick} · {order.package_type}</h3><p className="mt-1 text-sm text-gray-400">{new Date(order.created_at).toLocaleString("pl-PL")} · {order.price_m}M</p></div><span className={order.status==="approved"?"text-green-300":order.status==="rejected"?"text-red-300":"text-amber-300"}>{order.status==="approved"?"Zaakceptowane":order.status==="rejected"?"Odrzucone":"Oczekujące"}</span></article>)}</div>}
        </section>
        <footer className="mt-14 border-t border-white/10 pt-7 text-center"><a href="/" className="text-sm text-gray-400 underline">Wróć na stronę główną</a></footer>
      </div>
    </main>
  );
}
