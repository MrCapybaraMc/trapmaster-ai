"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Podane hasła nie są takie same.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setMessage(error.message || "Nie udało się ustawić nowego hasła. Otwórz najnowszy link z wiadomości e-mail.");
      return;
    }

    setSuccess(true);
    setPassword("");
    setConfirmation("");
    setMessage("Hasło zostało zmienione. Możesz teraz zalogować się nowym hasłem.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070910] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-purple-400/25 bg-[#11111c] p-7 shadow-2xl md:p-9">
        <Link href="/" className="text-sm font-black tracking-widest text-purple-300">TRAPMASTERS</Link>
        <h1 className="mt-5 text-3xl font-black">Ustaw nowe hasło</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">Wpisz nowe hasło do swojego konta. Ta strona działa po otwarciu ważnego linku resetującego z wiadomości e-mail.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-sm font-semibold">
            Nowe hasło
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 outline-none focus:border-purple-400"
              placeholder="Co najmniej 8 znaków"
            />
          </label>
          <label className="block text-sm font-semibold">
            Powtórz nowe hasło
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 outline-none focus:border-purple-400"
              placeholder="Wpisz hasło ponownie"
            />
          </label>

          {message && (
            <p role="status" className={success ? "rounded-xl border border-green-400/30 bg-green-400/10 p-3 text-sm text-green-200" : "rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"}>
              {message}
            </p>
          )}

          {!success && (
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-purple-600 px-5 py-3 font-black hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Zapisywanie..." : "ZAPISZ NOWE HASŁO"}
            </button>
          )}
        </form>

        {success && <Link href="/register" className="mt-5 block rounded-xl bg-green-600 px-5 py-3 text-center font-bold hover:bg-green-500">Przejdź do logowania</Link>}
        <Link href="/" className="mt-5 block text-center text-sm text-white/55 underline">Wróć na stronę główną</Link>
      </section>
    </main>
  );
}
