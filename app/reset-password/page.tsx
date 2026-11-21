"use client";

import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070910] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-purple-400/25 bg-[#11111c] p-7 shadow-2xl md:p-9">
        <Link href="/" className="text-sm font-black tracking-widest text-purple-300">TRAPMASTERS</Link>
        <h1 className="mt-5 text-3xl font-black">Resetowanie haseł wyłączone</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">Na TrapMasters nie można obecnie zresetować hasła przez tę stronę. Jeśli nie możesz zalogować się na konto, skontaktuj się z administracją przez support.</p>
        <Link href="/" className="mt-6 block rounded-xl bg-purple-600 px-5 py-3 text-center font-bold hover:bg-purple-500">Wróć na stronę główną</Link>
      </section>
    </main>
  );
}
