
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const STORAGE_KEY = "trapmasters_music_enabled";

export default function TrapmasterPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);

  const [goal, setGoal] = useState("");
  const [items, setItems] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  // Odczyt ustawienia dźwięku zapisanego na urządzeniu
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setMusicEnabled(saved === "true");

    function handleMusicChange(event) {
      setMusicEnabled(Boolean(event.detail));
    }

    window.addEventListener(
      "trapmasters-music-change",
      handleMusicChange
    );

    return () => {
      window.removeEventListener(
        "trapmasters-music-change",
        handleMusicChange
      );
    };
  }, []);

  // Sprawdzanie dostępu do TrapMaster
  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/register");
        return;
      }

      const { data: roleData } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      let hasAccess =
        roleData?.role === "owner" ||
        roleData?.role === "admin";

      if (!hasAccess) {
        const now = new Date().toISOString();

        const { data: orders, error } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .limit(1);

        hasAccess = !error && Boolean(orders?.length);
      }

      if (!mounted) return;

      setAllowed(hasAccess);
      setLoading(false);

      if (!hasAccess) {
        router.replace("/");
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  // Synchronizacja dźwięku filmu z przełącznikiem
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !musicEnabled;

    if (musicEnabled) {
      video.play().catch(() => {
        // Przeglądarka może wymagać kliknięcia użytkownika.
      });
    }
  }, [musicEnabled]);

  function toggleMusic() {
    const next = !musicEnabled;

    setMusicEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));

    window.dispatchEvent(
      new CustomEvent("trapmasters-music-change", {
        detail: next,
      })
    );

    if (videoRef.current) {
      videoRef.current.muted = !next;

      if (next) {
        videoRef.current.play().catch(() => {});
      }
    }
  }

  function submitIdea() {
    if (!goal.trim()) {
      alert("Najpierw wpisz swój cel.");
      return;
    }

    if (!items.trim()) {
      alert("Wpisz przedmioty, które posiadasz.");
      return;
    }

    alert(
      "Formularz jest gotowy. Agent AI nie jest jeszcze podłączony."
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070910] text-white">
        Sprawdzanie dostępu do TrapMaster...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070910] text-white">
      <div className="fixed inset-0">
        <video
          ref={videoRef}
          autoPlay
          muted={!musicEnabled}
          loop
          playsInline
          className="h-full w-full object-cover opacity-40"
        >
          <source src="/videos/trap.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-[#070910]/70" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10 bg-black/40 px-6 py-5 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <a href="/" className="text-2xl font-black">
              TRAP<span className="text-purple-400">MASTERS</span>
            </a>

            <div className="flex flex-wrap gap-4">
              <a href="/" className="rounded-lg border border-white/20 px-4 py-2">
                Strona główna
              </a>

              <a href="/account" className="rounded-lg border border-white/20 px-4 py-2">
                Moje konto
              </a>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <p className="font-bold tracking-[0.35em] text-purple-300">
              INTELIGENTNY ASYSTENT
            </p>

            <h1 className="mt-5 text-5xl font-black md:text-7xl">
              TRAP<span className="text-purple-400">MASTER</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/70">
              Opisz swój cel, podaj dostępne przedmioty i przygotuj się
              na stworzenie projektu trapa dopasowanego do Twoich możliwości.
            </p>
          </div>

          <div className="mt-14 rounded-3xl border border-purple-400/30 bg-black/60 p-7 backdrop-blur-xl md:p-10">
            <h2 className="text-2xl font-black">
              STWÓRZ SWÓJ PROJEKT
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Im dokładniej opiszesz sytuację i przedmioty, tym łatwiej
              będzie dobrać odpowiedni projekt.
            </p>

            <label className="mt-8 block font-bold">
              1. Jaki jest Twój cel?
            </label>

            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Opisz, jaki trap chcesz zbudować..."
              rows={5}
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 p-4 text-white outline-none focus:border-purple-400"
            />

            <label className="mt-7 block font-bold">
              2. Jakie masz przedmioty?
            </label>

            <textarea
              value={items}
              onChange={(event) => setItems(event.target.value)}
              placeholder="Np. redstone, pistony, obserwatory, bloki..."
              rows={5}
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 p-4 text-white outline-none focus:border-purple-400"
            />

            <label className="mt-7 block font-bold">
              3. Dodatkowe informacje (opcjonalnie)
            </label>

            <textarea
              value={extraInfo}
              onChange={(event) => setExtraInfo(event.target.value)}
              placeholder="Np. wersja Minecraft, dostępne miejsce..."
              rows={3}
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 p-4 text-white outline-none focus:border-purple-400"
            />

            <button
              onClick={submitIdea}
              className="mt-8 w-full rounded-xl bg-purple-600 px-6 py-5 font-black hover:bg-purple-500"
            >
              ANALIZUJ I DOBIERZ TRAP
            </button>

            <p className="mt-5 text-center text-xs leading-6 text-white/40">
              Generator AI nie jest jeszcze podłączony.
            </p>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-white/50">
              Vid from Lecato
            </p>
          </div>
        </section>
      </div>

      {/* Globalny przełącznik dźwięku */}
      <button
        onClick={toggleMusic}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-purple-300/30 bg-purple-600 px-5 py-3 font-bold shadow-xl hover:bg-purple-500"
      >
        {musicEnabled ? "🔊 Dźwięk: WŁĄCZONY" : "🔇 Dźwięk: WYŁĄCZONY"}
      </button>
    </main>
  );
}
