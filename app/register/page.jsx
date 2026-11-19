
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();

  const [mode, setMode] = useState("register");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        const cleanNickname = nickname.trim();
        if (cleanNickname.length < 3 || cleanNickname.length > 32) throw new Error("Nick konta musi mieć od 3 do 32 znaków.");
        if (password !== confirmPassword) throw new Error("Hasła nie są identyczne.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname: cleanNickname, display_name: cleanNickname } },
        });

        if (error) throw error;

        if (!data.session) {
          setMessage("Konto utworzone! Sprawdź e-mail i potwierdź rejestrację.");
        } else {
          setMessage("Konto utworzone! Przekierowuję...");
          router.push("/");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/");
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
        <a href="/" className="text-sm text-gray-400 hover:text-white">
          ← Powrót na stronę główną
        </a>

        <h1 className="mt-6 text-3xl font-black">
          TRAP<span className="text-purple-400">MASTERS</span>
        </h1>

        <p className="mt-2 text-gray-400">
          {mode === "register"
            ? "Utwórz konto, aby korzystać z oferty."
            : "Zaloguj się na swoje konto."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
            className={`rounded-lg p-3 ${mode === "register" ? "bg-purple-600" : "text-gray-400"}`}
          >
            Rejestracja
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`rounded-lg p-3 ${mode === "login" ? "bg-purple-600" : "text-gray-400"}`}
          >
            Logowanie
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-gray-300">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-500"
              placeholder="twoj@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Hasło</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-500"
              placeholder="Minimum 6 znaków"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 p-3 font-bold transition hover:bg-purple-500 disabled:opacity-50"
          >
            {loading
              ? "Chwilka..."
              : mode === "register"
                ? "Utwórz konto"
                : "Zaloguj się"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-gray-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
