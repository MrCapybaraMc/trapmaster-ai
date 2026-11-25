"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function RegisterPage({ initialMode = "register" }) {
  const supabase = createClient();
  const router = useRouter();

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { setRecovery(true); setMode("login"); setMessage("Ustaw nowe hasło do konta."); }
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function sendPasswordReset() {
    setMessage("");
    if (!email.trim()) { setMessage("Wpisz e-mail konta, aby wysłać link resetujący."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` });
      if (error) throw error;
      setResetSent(true);
      setMessage("Jeśli konto z tym adresem istnieje, wysłaliśmy link do zmiany hasła. Sprawdź też folder SPAM.");
    } catch (error) { setMessage(error.message || "Nie udało się wysłać linku."); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecovery(false);
        setMessage("Hasło zostało zmienione. Możesz się zalogować.");
        await supabase.auth.signOut();
      } else if (mode === "register") {
        const cleanNickname = nickname.trim();
        if (cleanNickname.length < 3 || cleanNickname.length > 32) throw new Error("Nick konta musi mieć od 3 do 32 znaków.");
        if (password !== confirmPassword) throw new Error("Hasła nie są identyczne.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname: cleanNickname, display_name: cleanNickname }, emailRedirectTo: `${window.location.origin}/login` },
        });

        if (error) throw error;

        if (!data.session) {
          setMessage("Konto utworzone! Sprawdź e-mail i potwierdź rejestrację.");
        } else {
          setMessage("Konto utworzone! Przekierowuję...");
          router.push("/update-1");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.push("/update-1");
        router.refresh();
      }
    } catch (error) {
      setMessage(error.message || "Wystąpił błąd.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080b12] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-8 shadow-2xl">
        <a href="/" className="text-sm text-gray-400 hover:text-white">← Powrót do TrapMasters</a>
        <h1 className="mt-6 text-3xl font-black">TRAP<span className="text-purple-400">MASTERS</span></h1>
        <p className="mt-2 text-gray-400">{recovery ? "Ustaw nowe hasło." : mode === "register" ? "Utwórz osobne konto beta." : "Zaloguj się na konto beta."}</p>
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1">
          <button type="button" onClick={() => { setMode("register"); setMessage(""); }} className={`rounded-lg p-3 ${mode === "register" ? "bg-purple-600" : "text-gray-400"}`}>Rejestracja</button>
          <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={`rounded-lg p-3 ${mode === "login" ? "bg-purple-600" : "text-gray-400"}`}>Logowanie</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && !recovery && <div>
            <label className="mb-2 block text-sm text-gray-300">Nickname konta</label>
            <input type="text" required minLength={3} maxLength={32} value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-500" placeholder="Twój nickname" />
          </div>}
          <div>
            <label className="mb-2 block text-sm text-gray-300">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-500" placeholder="twoj@email.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-gray-300">Hasło</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-500" placeholder="Minimum 6 znaków" />
          </div>
          {mode === "register" && <div>
            <label className="mb-2 block text-sm text-gray-300">Powtórz hasło</label>
            <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-500" placeholder="Wpisz hasło ponownie" />
          </div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-purple-600 p-3 font-bold transition hover:bg-purple-500 disabled:opacity-50">{loading ? "Chwilka..." : mode === "register" ? "Utwórz konto" : "Zaloguj się"}</button>
        </form>
        {mode === "login" && !recovery && <button type="button" onClick={sendPasswordReset} disabled={loading || resetSent} className="mt-4 text-sm text-purple-300 underline disabled:opacity-50">{resetSent ? "Link resetujący został wysłany" : "Nie pamiętasz hasła? Wyślij link resetujący"}</button>}
        {message && <p role="status" className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-gray-300">{message}</p>}
      </div>
    </main>
  );
}
