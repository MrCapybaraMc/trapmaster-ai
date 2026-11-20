"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === "PASSWORD_RECOVERY" || session)) setReady(Boolean(session));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Nowe hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Hasła nie są identyczne.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message || "Nie udało się zmienić hasła. Poproś o nowy link resetujący.");
    } else {
      setMessage("Hasło zostało zmienione. Przekierowuję do strony głównej...");
      setTimeout(() => router.push("/"), 1200);
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#080b12] text-white flex items-center justify-center p-5">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-8 shadow-2xl">
        <a href="/" className="text-sm text-gray-400 hover:text-white">← Powrót na stronę główną</a>
        <h1 className="mt-6 text-3xl font-black">Ustaw nowe hasło</h1>
        {!ready ? (
          <p className="mt-4 text-gray-300">Otwórz tę stronę z linku resetującego wysłanego na adres e-mail. Jeśli link wygasł, poproś administratora o wysłanie nowego.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">Nowe hasło</label>
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-cyan-500" placeholder="Co najmniej 8 znaków" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Powtórz nowe hasło</label>
              <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-cyan-500" placeholder="Wpisz hasło ponownie" />
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-cyan-600 p-3 font-bold hover:bg-cyan-500 disabled:opacity-50">{busy ? "Zapisywanie..." : "Zapisz nowe hasło"}</button>
          </form>
        )}
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-gray-300">{message}</p>}
      </section>
    </main>
  );
}
