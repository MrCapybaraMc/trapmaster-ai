
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";

type Package = {
  id: "week" | "month" | "forever";
  name: string;
  price: number;
  duration: string;
  description: string;
  popular?: boolean;
};

type UserRole = "user" | "admin" | "owner";

const MUSIC_KEY = "trapmasters_music_enabled";

const packages: Package[] = [
  {
    id: "week",
    name: "TYDZIEŃ",
    price: 5,
    duration: "7 dni dostępu",
    description: "Idealny na początek",
  },
  {
    id: "month",
    name: "MIESIĄC",
    price: 12,
    duration: "30 dni dostępu",
    description: "Więcej czasu na zabawę",
    popular: true,
  },
  {
    id: "forever",
    name: "NA ZAWSZE",
    price: 28,
    duration: "Bez limitu czasowego",
    description: "Jednorazowy zakup",
  },
];

function formatPrice(value: number) {
  return Number(value.toFixed(2)).toString() + "M";
}

export default function Home() {
  const [supabase] = useState(() => createClient());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [selected, setSelected] = useState<Package | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const [hasTrapperAccess, setHasTrapperAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [musicEnabled, setMusicEnabled] = useState(false);

  const [minecraftNick, setMinecraftNick] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Odczyt wspólnego ustawienia dźwięku.
  useEffect(() => {
    const saved = localStorage.getItem(MUSIC_KEY);
    setMusicEnabled(saved === "true");

    function handleMusicChange(event: Event) {
      const customEvent = event as CustomEvent<boolean>;
      setMusicEnabled(Boolean(customEvent.detail));
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

  // Sprawdzanie dostępu użytkownika i ustawień strony.
  useEffect(() => {
    let mounted = true;

    async function loadRole(userId: string | undefined) {
      if (!userId) {
        if (mounted) {
          setUserRole("user");
          setHasTrapperAccess(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;

      let role: UserRole = "user";

      if (!error && data?.role === "owner") {
        role = "owner";
      } else if (!error && data?.role === "admin") {
        role = "admin";
      }

      setUserRole(role);

      if (role === "owner" || role === "admin") {
        setHasTrapperAccess(true);
        return;
      }

      const now = new Date().toISOString();

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1);

      if (!mounted) return;

      setHasTrapperAccess(!ordersError && Boolean(orders?.length));
    }

    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (mounted) {
        setLoggedIn(!!user);
        setAuthLoading(false);
      }

      await loadRole(user?.id);

      if (!mounted) return;

      const { data, error } = await supabase
        .from("site_settings")
        .select("orders_paused")
        .eq("id", true)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        setPaused(true);
        setOrderMessage(
          "Nie udało się sprawdzić dostępności strony. Spróbuj ponownie później."
        );
      } else {
        setPaused(!!data.orders_paused);
      }

      setSettingsLoading(false);
    }

    loadData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setLoggedIn(!!session);
      await loadRole(session?.user.id);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Synchronizacja dźwięku z aktualnym filmem.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !musicEnabled;

    if (musicEnabled) {
      video.play().catch(() => {});
    }
  }, [musicEnabled, selected]);

  // Wspólny przełącznik muzyki dla wszystkich lobby.
  function toggleMusic() {
    const next = !musicEnabled;

    setMusicEnabled(next);

    localStorage.setItem(MUSIC_KEY, String(next));

    window.dispatchEvent(
      new CustomEvent("trapmasters-music-change", {
        detail: next,
      })
    );

    const video = videoRef.current;

    if (video) {
      video.muted = !next;

      if (next) {
        video.play().catch(() => {});
      }
    }
  }

  const discount =
    discountCode.trim().toLowerCase() === "trapstarter"
      ? selected?.id === "forever"
        ? 25
        : 15
      : 0;

  const finalPrice = selected
    ? Number((selected.price * (100 - discount) / 100).toFixed(2))
    : 0;

  const paymentCommand = selected
    ? `/pay MrCapybaraMc ${formatPrice(finalPrice)}`
    : "";

  function choosePackage(pkg: Package) {
    setSelected(pkg);
    setMinecraftNick("");
    setDiscountCode("");
    setCopied(false);
    setOrderMessage("");
    setOrderSuccess(false);

    setTimeout(() => {
      document.getElementById("payment")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(paymentCommand);
      setCopied(true);
    } catch {
      setOrderMessage(
        "Nie udało się skopiować komendy. Możesz skopiować ją ręcznie."
      );
    }
  }

  async function submitOrder() {
    if (!selected) return;

    if (!loggedIn) {
      setOrderMessage("Najpierw zaloguj się na swoje konto.");
      return;
    }

    if (!minecraftNick.trim()) {
      setOrderMessage("Wpisz swój nick Minecraft.");
      return;
    }

    setSubmitting(true);
    setOrderMessage("");

    const { data, error } = await supabase.rpc("create_order", {
      p_minecraft_nick: minecraftNick.trim(),
      p_package_type: selected.id,
      p_discount_code: discountCode.trim(),
    });

    setSubmitting(false);

    if (error) {
      setOrderMessage(error.message);
      return;
    }

    const result = data as {
      order_id: string;
      price_m: number;
      discount_percent: number;
    };

    setOrderSuccess(true);
    setOrderMessage(
      `Zamówienie zostało wysłane! Numer zamówienia: ${result.order_id}`
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070910] text-white">
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          key={selected ? "offer" : "background"}
          autoPlay
          muted={!musicEnabled}
          loop
          playsInline
          className="h-full w-full object-cover opacity-60"
        >
          <source
            src={selected ? "/videos/oferta.mp4" : "/videos/ender-bg.mp4"}
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-[#070910]/45" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10 bg-black/25 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
            <a href="/" className="text-2xl font-black tracking-wider">
              TRAP<span className="text-purple-500">MASTERS</span>
            </a>

            <nav className="flex flex-wrap items-center gap-5 text-sm text-gray-200">
              <a href="#oferta" className="hover:text-purple-400">Oferta</a>
              <a href="#trapmaster" className="hover:text-purple-400">TrapMaster</a>
              <a href="#informacje" className="hover:text-purple-400">Informacje</a>

              {loggedIn && (
                <a href="/account" className="font-bold text-purple-300 hover:text-purple-200">
                  Moje konto
                </a>
              )}

              {loggedIn && hasTrapperAccess && (
                <a
                  href="/trapmaster"
                  className="rounded-lg border border-purple-400/50 bg-purple-600/20 px-4 py-2 font-bold text-purple-200 hover:bg-purple-600/40"
                >
                  Trapper
                </a>
              )}

              {(userRole === "admin" || userRole === "owner") && (
                <a href="/admin" className="font-bold text-cyan-300 hover:text-cyan-200">
                  Zamówienia
                </a>
              )}

              {userRole === "owner" && (
                <a href="/owner" className="font-bold text-yellow-300 hover:text-yellow-200">
                  Panel ownera
                </a>
              )}

              <a
                href="https://www.youtube.com/@MrCapybara-s"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-red-400"
              >
                YouTube
              </a>

              <a href="https://discord.gg/sJaBPzx36" target="_blank" rel="noreferrer">
                Discord
              </a>
            </nav>

            {authLoading ? (
              <span className="text-sm text-gray-400">Ładowanie...</span>
            ) : loggedIn ? (
              <a
                href="/account"
                className="rounded-xl border border-green-400/40 bg-green-500/15 px-5 py-3 text-sm font-bold text-green-300"
              >
                ✓ Moje konto
              </a>
            ) : (
              <a
                href="/register"
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold hover:bg-purple-500"
              >
                ZALOGUJ / ZAREJESTRUJ
              </a>
            )}
          </div>
        </header>

        {settingsLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            Sprawdzanie dostępności strony...
          </div>
        ) : paused ? (
          <section className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
            <div className="max-w-2xl rounded-3xl border border-red-400/40 bg-black/65 p-10 backdrop-blur-sm">
              <div className="text-5xl">🔧</div>
              <h1 className="mt-6 text-4xl font-black md:text-5xl">
                Strona tymczasowo nie czynna
              </h1>
              <p className="mt-5 leading-7 text-white/75">
                Aktualnie nie przyjmujemy nowych zamówień.
                Zapraszamy ponownie później!
              </p>
              <a
                href="https://discord.gg/sJaBPzx36"
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-block rounded-xl bg-purple-600 px-8 py-4 font-bold"
              >
                DOŁĄCZ NA DISCORDA
              </a>
            </div>
          </section>
        ) : (
          <>
            <section className="mx-auto flex min-h-[650px] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
              <div className="mb-6 rounded-full border border-purple-400/50 bg-purple-950/30 px-5 py-2 text-sm text-purple-200">
                MINECRAFT TRAP LIBRARY
              </div>

              <h1 className="text-5xl font-black leading-tight md:text-7xl">
                ZOSTAŃ
                <span className="block text-purple-400">TRAP MASTEREM</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white drop-shadow-lg">
                Odkrywaj ciekawe pułapki Minecraft, poznawaj nowe pomysły
                i korzystaj z biblioteki TRAPMASTERS.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <a href="#oferta" className="rounded-xl bg-purple-600 px-8 py-4 font-bold">
                  ZOBACZ OFERTĘ
                </a>
                <a
                  href={loggedIn ? "/account" : "/register"}
                  className="rounded-xl border border-white/30 bg-black/30 px-8 py-4 font-bold"
                >
                  MOJE KONTO
                </a>
              </div>
            </section>

            <section id="oferta" className="mx-auto max-w-7xl px-6 py-24">
              <div className="mb-14 text-center">
                <p className="mb-3 font-bold tracking-[0.3em] text-purple-300">
                  WYBIERZ SWÓJ PLAN
                </p>
                <h2 className="text-4xl font-black md:text-5xl">NASZA OFERTA</h2>
                <p className="mt-4 text-white/80">
                  Wybierz pakiet dostępu do TRAPMASTERS.
                </p>
              </div>

              <div className="grid gap-7 md:grid-cols-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col rounded-3xl border p-8 backdrop-blur-sm transition hover:-translate-y-2 ${
                      pkg.popular
                        ? "border-purple-400/70 bg-purple-950/35"
                        : "border-white/20 bg-black/25"
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-5 py-2 text-xs font-black">
                        NAJPOPULARNIEJSZY
                      </div>
                    )}

                    <h3 className="mt-3 text-xl font-black">{pkg.name}</h3>
                    <p className="mt-3 text-sm text-white/75">{pkg.description}</p>

                    <div className="my-8">
                      <span className="text-5xl font-black text-purple-300">
                        {formatPrice(pkg.price)}
                      </span>
                      <p className="mt-2 text-sm text-white/70">dolarów serwerowych</p>
                    </div>

                    <p className="mb-8 text-sm text-white/85">{pkg.duration}</p>

                    <button
                      onClick={() => choosePackage(pkg)}
                      className="mt-auto w-full rounded-xl bg-purple-600 py-4 font-bold hover:bg-purple-500"
                    >
                      WYBIERAM TEN PLAN
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-center text-sm text-white/70">
                Płatności przyjmowane są w dolarach serwerowych BananaSMP.pl.
              </p>
            </section>

            {selected && (
              <section id="payment" className="mx-auto max-w-3xl px-6 py-20">
                <div className="rounded-3xl border border-purple-400/50 bg-[#100d20]/90 p-8 text-center backdrop-blur-sm md:p-12">
                  <p className="font-bold tracking-[0.25em] text-purple-300">
                    TWÓJ WYBRANY PLAN
                  </p>
                  <h2 className="mt-5 text-4xl font-black">{selected.name}</h2>
                  <p className="mt-3 text-white/70">{selected.duration}</p>

                  <div className="mt-8 text-left">
                    <label className="mb-2 block text-sm text-white/80">
                      Nick Minecraft
                    </label>
                    <input
                      value={minecraftNick}
                      onChange={(e) => setMinecraftNick(e.target.value)}
                      maxLength={16}
                      placeholder="Np. MrCapybara"
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-4 text-white outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="mt-5 text-left">
                    <label className="mb-2 block text-sm text-white/80">
                      Kod rabatowy (opcjonalnie)
                    </label>
                    <input
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value);
                        setCopied(false);
                      }}
                      placeholder="Wpisz kod, jeśli go posiadasz"
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-4 text-white outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="mt-8 rounded-xl border border-white/15 bg-black/30 p-5">
                    <p className="text-white/70">Cena do zapłaty</p>
                    <p className="mt-2 text-4xl font-black text-purple-300">
                      {formatPrice(finalPrice)}
                    </p>
                    {discount > 0 && (
                      <p className="mt-2 text-sm text-green-300">
                        Rabat {discount}% został naliczony.
                      </p>
                    )}
                    <p className="mt-2 text-sm text-white/60">dolarów serwerowych</p>
                  </div>

                  <div className="mt-8 rounded-xl border border-white/15 bg-black/30 p-5">
                    <p className="mb-3 text-sm text-white/70">Komenda płatności:</p>
                    <code className="break-all text-lg font-bold text-purple-300">
                      {paymentCommand}
                    </code>
                    <button
                      onClick={copyCommand}
                      className="mt-5 w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500"
                    >
                      {copied ? "SKOPIOWANO!" : "KOPIUJ KOMENDĘ"}
                    </button>
                  </div>

                  <div className="mt-6 rounded-xl border border-purple-400/30 bg-purple-950/30 p-5 text-left">
                    <h3 className="font-bold text-purple-200">Jak zrealizować zamówienie?</h3>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/80">
                      <li>Skopiuj komendę płatności.</li>
                      <li>Wejdź na BananaSMP i wykonaj komendę.</li>
                      <li>Upewnij się, że płatność została wysłana.</li>
                      <li>Wróć tutaj i kliknij przycisk wysłania zamówienia.</li>
                    </ol>
                  </div>

                  <div className="mt-6 rounded-xl border border-white/15 bg-black/30 p-5">
                    <p className="font-bold">Czas realizacji zamówienia</p>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                      Zamówienia są realizowane do 24h w dni robocze i do 36h w dni wolne.
                    </p>
                  </div>

                  {orderMessage && (
                    <div
                      className={`mt-6 rounded-xl border p-4 text-sm ${
                        orderSuccess
                          ? "border-green-400/40 bg-green-500/10 text-green-200"
                          : "border-red-400/40 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {orderMessage}
                    </div>
                  )}

                  {!orderSuccess && (
                    <button
                      onClick={submitOrder}
                      disabled={submitting || !loggedIn}
                      className="mt-7 w-full rounded-xl bg-green-600 py-4 font-bold hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "WYSYŁANIE..." : "ZAPŁACIŁEM — WYŚLIJ ZAMÓWIENIE"}
                    </button>
                  )}

                  {!loggedIn && (
                    <p className="mt-4 text-sm text-yellow-200">
                      Aby wysłać zamówienie, musisz się zalogować.
                      <a href="/register" className="ml-1 underline">
                        Zaloguj się tutaj.
                      </a>
                    </p>
                  )}

                  <button
                    onClick={() => {
                      setSelected(null);
                      setCopied(false);
                      setOrderMessage("");
                      setOrderSuccess(false);
                    }}
                    className="mt-7 text-sm text-white/70 underline"
                  >
                    Wróć do oferty
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* SEKCJA TRAPMASTER */}
        <section
          id="trapmaster"
          className="border-y border-purple-400/20 bg-[#100b20]/80 px-6 py-24 backdrop-blur-sm"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 inline-block rounded-full border border-purple-400/40 bg-purple-950/50 px-5 py-2 text-sm font-bold tracking-widest text-purple-200">
                INTELIGENTNY ASYSTENT MINECRAFT
              </div>

              <h2 className="text-4xl font-black md:text-6xl">
                CZYM JEST <span className="text-purple-400">TRAPMASTER?</span>
              </h2>

              <p className="mt-7 text-lg leading-8 text-white/75">
                TrapMaster to inteligentne narzędzie, które pomaga dobrać
                odpowiedni trap do Twojego celu i przedmiotów, które masz
                w Minecraft. Opisujesz agentowi swoją sytuację, podajesz
                dostępne itemy, a on analizuje możliwości i przygotowuje
                propozycję konstrukcji.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: "🎯",
                  step: "KROK 01",
                  title: "WPISZ SWÓJ CEL",
                  description: "Opisz, co chcesz osiągnąć, w jakiej sytuacji ma zadziałać trap i jakie masz wymagania.",
                },
                {
                  icon: "📦",
                  step: "KROK 02",
                  title: "PODAJ SWOJE ITEMY",
                  description: "Wpisz, jakie przedmioty posiadasz, np. bloki, redstone, mechanizmy i inne elementy dostępne w grze.",
                },
                {
                  icon: "🤖",
                  step: "KROK 03",
                  title: "AGENT ANALIZUJE",
                  description: "Agent bierze pod uwagę Twój cel i dostępne przedmioty, a następnie dobiera pasujący projekt.",
                },
                {
                  icon: "🗺️",
                  step: "KROK 04",
                  title: "ODBIERZ SCHEMAT",
                  description: "Dostajesz instrukcję krok po kroku oraz schematyczny projekt, który pomoże Ci zbudować wybrany trap.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-purple-400/25 bg-black/35 p-7 transition hover:-translate-y-1 hover:border-purple-400/60"
                >
                  <div className="text-4xl">{item.icon}</div>
                  <p className="mt-5 text-sm font-black tracking-widest text-purple-300">
                    {item.step}
                  </p>
                  <h3 className="mt-3 text-xl font-black">{item.title}</h3>
                  <p className="mt-4 leading-7 text-white/65">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-purple-400/30 bg-purple-950/35 p-8 text-center">
              <p className="text-xl font-black leading-8 text-purple-200 md:text-2xl">
                TY PODAJESZ CEL I PRZEDMIOTY.
                <br />
                TRAPMASTER ZAJMUJE SIĘ RESZTĄ.
              </p>

              <p className="mt-5 text-sm leading-6 text-white/60">
                Dostęp do narzędzia jest przyznawany na stronie po
                zatwierdzeniu pakietu. Jest to dostęp do funkcji serwisu
                TRAPMASTERS, a nie automatyczna ranga na serwerze Minecraft.
              </p>

              {loggedIn && hasTrapperAccess ? (
                <a
                  href="/trapmaster"
                  className="mt-8 inline-block rounded-xl bg-purple-600 px-9 py-4 font-black hover:bg-purple-500"
                >
                  OTWÓRZ TRAPMASTER
                </a>
              ) : (
                <a
                  href="#oferta"
                  className="mt-8 inline-block rounded-xl border border-purple-400/50 px-9 py-4 font-black hover:bg-purple-500/20"
                >
                  ZOBACZ PAKIETY DOSTĘPU
                </a>
              )}
            </div>
          </div>
        </section>

        <section id="informacje" className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/20 bg-black/25 p-8 backdrop-blur-sm">
              <div className="mb-5 text-3xl">ℹ️</div>
              <h3 className="text-2xl font-black">WAŻNA INFORMACJA</h3>
              <p className="mt-4 leading-7 text-white/85">
                TRAPMASTERS jest niezależnym projektem społecznościowym.
                Nie jest oficjalną stroną BananaSMP.pl i nie jest przez
                ten serwer prowadzony ani wspierany.
              </p>
              <p className="mt-4 text-sm text-white/70">
                W razie problemów możesz napisać na Discordzie lub na
                mrcapybarasyt@gmail.com.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-black/25 p-8 backdrop-blur-sm">
              <div className="mb-5 text-3xl">🛡️</div>
              <h3 className="text-2xl font-black">KONTA ADMINISTRATORÓW</h3>
              <p className="mt-4 leading-7 text-white/85">
                Wybranym kontom użytkowników możemy przyznać uprawnienia
                administratora. Administratorzy będą mogli zarządzać
                zamówieniami i pomagać użytkownikom.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-3xl rounded-3xl border border-purple-400/40 bg-purple-950/35 p-10 backdrop-blur-sm">
            <div className="text-4xl">💬</div>
            <h2 className="mt-5 text-3xl font-black">POTRZEBUJESZ POMOCY?</h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-white/85">
              Masz problem z zakupem, dostępem lub kontem?
              Dołącz na naszego Discorda i utwórz ticket,
              aby administracja mogła Ci pomóc.
            </p>
            <a
              href="https://discord.gg/sJaBPzx36"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-block rounded-xl bg-purple-600 px-9 py-4 font-bold"
            >
              DOŁĄCZ NA DISCORDA
            </a>
          </div>
        </section>

        <footer className="border-t border-white/20 bg-black/40 px-6 py-10 text-center backdrop-blur-sm">
          <p className="text-xl font-black">
            TRAP<span className="text-purple-500">MASTERS</span>
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-6 text-sm text-white/70">
            <a href="/register">Konto</a>
            <a href="https://discord.gg/sJaBPzx36" target="_blank" rel="noreferrer">
              Discord
            </a>
            <a href="https://www.youtube.com/@MrCapybara-s" target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-xs leading-6 text-white/50">
            TRAPMASTERS nie jest oficjalnie powiązany z BananaSMP.pl.
            Minecraft jest znakiem towarowym Mojang Studios.
          </p>

          <p className="mt-4 text-xs text-white/40">
            © 2026 TRAPMASTERS. Wszelkie prawa zastrzeżone.
          </p>
        </footer>
      </div>

      {/* PRZYCISK DŹWIĘKU DOSTĘPNY DLA KAŻDEGO */}
      <button
        onClick={toggleMusic}
        aria-label={musicEnabled ? "Wyłącz dźwięk" : "Włącz dźwięk"}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-purple-300/30 bg-purple-700 px-5 py-3 text-sm font-bold shadow-xl hover:bg-purple-600"
      >
        {musicEnabled ? "🔊 DŹWIĘK: WŁĄCZONY" : "🔇 DŹWIĘK: WYŁĄCZONY"}
      </button>
    </main>
  );
}
