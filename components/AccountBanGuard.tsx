"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function AccountBanGuard({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Access check timed out")), ms);
          }),
        ]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    async function checkAccount() {
      try {
        const { data: sessionData } = await withTimeout(supabase.auth.getSession());
        if (!sessionData.session?.user) {
          if (active) {
            setBlocked(false);
            setChecking(false);
          }
          return;
        }

        const { data, error } = await withTimeout(
          supabase.rpc("is_trapmasters_account_suspended")
        );
        if (active) {
          setBlocked(!error && data === true);
          setChecking(false);
        }
      } catch (error) {
        console.error("Account suspension check failed:", error);
        // Fail open if the access-check service is unavailable; the server-side
        // data API protection remains responsible for enforcing suspensions.
        if (active) {
          setBlocked(false);
          setChecking(false);
        }
      }
    }

    void checkAccount();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      if (active) setChecking(true);
      void checkAccount();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return <div className="min-h-screen bg-[#080b12] text-white grid place-items-center">Sprawdzanie dostępu...</div>;
  }

  if (blocked) {
    return (
      <main className="min-h-screen bg-[#080b12] text-white grid place-items-center p-6">
        <section className="max-w-lg rounded-3xl border border-red-400/30 bg-white/5 p-8 text-center">
          <p className="text-sm font-bold tracking-widest text-red-300">TRAPMASTERS</p>
          <h1 className="mt-4 text-3xl font-black">Dostęp do konta zablokowany</h1>
          <p className="mt-4 text-gray-300">To konto nie ma obecnie dostępu do strony TrapMasters. Jeśli uważasz, że to pomyłka, skontaktuj się z administracją.</p>
          <button onClick={() => createClient().auth.signOut()} className="mt-7 rounded-xl bg-white/10 px-5 py-3 font-bold hover:bg-white/20">Wyloguj</button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
