
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

type Language = "pl" | "en";

export default function SiteSettings() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("pl");
  const [sound, setSound] = useState(true);
  const [email, setEmail] = useState("");
  const [nick, setNick] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("trapmasters-language");
    const savedSound = localStorage.getItem("trapmasters_music_enabled");

    if (savedLanguage === "pl" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }

    if (savedSound === "false") {
      setSound(false);
    }

    const supabase = createClient();

    async function loadAccount() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (user) {
        setEmail(user.email ?? "");
        setNick(
          user.user_metadata?.minecraft_nick ??
          user.email?.split("@")[0] ??
          ""
        );

        const { data: access } = await supabase.rpc(
          "has_trapmaster_access"
        );

        setHasAccess(access === true);
      }

      setLoading(false);
    }

    loadAccount();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadAccount();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem("trapmasters-language", next);
    window.dispatchEvent(
      new CustomEvent("trapmasters-language-change", {
        detail: next,
      })
    );
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    localStorage.setItem("trapmasters_music_enabled", String(next));
    window.dispatchEvent(
      new CustomEvent("trapmasters-music-change", {
        detail: next,
      })
    );
  }

  const text =
    language === "pl"
      ? {
          settings: "Ustawienia",
          language: "Język",
          sound: "Muzyka",
          account: "Konto",
          loading: "Ładowanie...",
          guest: "Nie jesteś zalogowany",
          access: "Dostęp TrapMaster",
          active: "Aktywny",
          inactive: "Nieaktywny",
          accountPage: "Przejdź do konta",
          on: "Włączony",
          off: "Wyłączony",
        }
      : {
          settings: "Settings",
          language: "Language",
          sound: "Sound",
          account: "Account",
          loading: "Loading...",
          guest: "You are not logged in",
          access: "TrapMaster access",
          active: "Active",
          inactive: "Inactive",
          accountPage: "Open account",
          on: "On",
          off: "Off",
        };

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      {open && (
        <div className="mb-3 w-72 rounded-2xl border border-red-500/30 bg-[#101014]/95 p-5 text-white shadow-2xl backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-bold">
            {text.settings}
          </h2>

          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-400">
              {text.language}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => changeLanguage("pl")}
                className={`rounded-lg px-3 py-2 ${
                  language === "pl"
                    ? "bg-red-600"
                    : "bg-white/10"
                }`}
              >
                Polski
              </button>
              <button
                onClick={() => changeLanguage("en")}
                className={`rounded-lg px-3 py-2 ${
                  language === "en"
                    ? "bg-red-600"
                    : "bg-white/10"
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="mb-4">
  <p className="mb-2 text-sm text-gray-400">
    Muzyka
  </p>
  <button
    onClick={toggleSound}
    className="w-full rounded-lg bg-white/10 px-3 py-2 text-left hover:bg-white/20"
  >
    {sound ? "🔊 Włączona" : "🔇 Wyłączona"}
  </button>
</div>

          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-sm font-semibold">
              {text.account}
            </p>

            {loading ? (
              <p className="text-sm text-gray-400">
                {text.loading}
              </p>
            ) : email ? (
              <>
                <p className="break-all text-sm text-gray-300">
                  {email}
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  Minecraft: {nick}
                </p>
                <p className="mt-2 text-sm">
                  {text.access}:{" "}
                  <span
                    className={
                      hasAccess ? "text-green-400" : "text-red-400"
                    }
                  >
                    {hasAccess ? text.active : text.inactive}
                  </span>
                </p>
                <a
                  href="/account"
                  className="mt-3 block rounded-lg bg-red-600 px-3 py-2 text-center font-semibold hover:bg-red-500"
                >
                  {text.accountPage}
                </a>
              </>
            ) : (
              <a
                href="/account"
                className="text-sm text-red-400 hover:underline"
              >
                {text.guest}
              </a>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={text.settings}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500 bg-[#17171d] text-3xl text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] transition duration-200 hover:scale-110 hover:bg-red-600"
      >
        ⚙️
      </button>
    </div>
  );
}




