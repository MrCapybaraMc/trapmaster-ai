
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SkinViewer, IdleAnimation } from "skinview3d";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_SKIN = "/skins/zenek.png";
const STORAGE_KEY = "trapmasters_music_enabled";
const LEGACY_STORAGE_KEY = "trapmasters-music";
const MUSIC_EVENT = "trapmasters-music-change";

const armorOptions = [
  "Diax zbroja 4/3",
  "Diax zbroja lub gorzej bez enchantów",
  "Netherite 4/3",
  "Ametystowa",
  "Szmaragdowa",
];

const totemOptions = [
  "Nie",
  "Tak, tylko jeden",
  "Tak, cały ekwipunek",
  "Tak, kilka",
];

const armorColors: Record<string, {
  border: string;
  background: string;
  glow: string;
  text: string;
  dot: string;
}> = {
  "Diax zbroja 4/3": {
    border: "border-sky-400",
    background: "bg-sky-500/20",
    glow: "shadow-[0_0_35px_rgba(56,189,248,0.55)]",
    text: "text-sky-300",
    dot: "bg-sky-400",
  },
  "Diax zbroja lub gorzej bez enchantów": {
    border: "border-cyan-400",
    background: "bg-cyan-500/15",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.45)]",
    text: "text-cyan-200",
    dot: "bg-cyan-400",
  },
  "Netherite 4/3": {
    border: "border-zinc-400",
    background: "bg-zinc-500/20",
    glow: "shadow-[0_0_35px_rgba(161,161,170,0.45)]",
    text: "text-zinc-200",
    dot: "bg-zinc-300",
  },
  Ametystowa: {
    border: "border-purple-400",
    background: "bg-purple-500/20",
    glow: "shadow-[0_0_35px_rgba(192,132,252,0.55)]",
    text: "text-purple-300",
    dot: "bg-purple-400",
  },
  Szmaragdowa: {
    border: "border-emerald-400",
    background: "bg-emerald-500/20",
    glow: "shadow-[0_0_35px_rgba(52,211,153,0.55)]",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
};

const armorFonts: Record<string, string> = {
  "Diax zbroja 4/3": '"Trebuchet MS", sans-serif',
  "Diax zbroja lub gorzej bez enchantpłw": '"Comic Sans MS", cursive',
  "Netherite 4/3": '"Trebuchet MS", Arial, sans-serif',
  Ametystowa: 'Georgia, "Times New Roman", serif',
  Szmaragdowa: '"Palatino Linotype", "Book Antiqua", serif',
};

const choiceFonts = {
  totems: '"Trebuchet MS", sans-serif',
  puller: '"Courier New", monospace',
  feather: "Georgia, serif",
};

function PlayerViewer({
  skinUrl,
  onSkinClick,
}: {
  skinUrl: string;
  onSkinClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: 360,
      height: 390,
    });

    viewerRef.current = viewer;
    viewer.animation = new IdleAnimation();
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;
    viewer.controls.autoRotate = true;
    viewer.controls.autoRotateSpeed = 2;
    viewer.camera.position.set(25, 15, 40);

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !skinUrl) return;

    viewerRef.current.loadSkin(skinUrl).catch((error) => {
      console.error("Nie udało się załadować skina:", error);
    });
  }, [skinUrl]);

  return (
    <canvas
      ref={canvasRef}
      onClick={onSkinClick}
      className="h-[390px] w-full max-w-[360px] cursor-pointer"
      title="Kliknij trzy razy szybko"
    />
  );
}

function MoneyRain({ burstKey }: { burstKey: number }) {
  const symbols = Array.from({ length: 42 }, (_, index) => index);

  return (
    <div
      key={burstKey}
      className="money-rain pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden="true"
    >
      <div className="money-flash absolute inset-0" />

      {symbols.map((index) => {
        const left = (index * 37) % 100;
        const delay = (index % 8) * 0.12;
        const duration = 2.5 + (index % 5) * 0.35;
        const size = 18 + (index % 4) * 8;

        return (
          <span
            key={index}
            className="money-symbol absolute -top-16 font-black text-emerald-300"
            style={{
              left: `${left}%`,
              fontSize: `${size}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {index % 5 === 0 ? "âś¦" : "$"}
          </span>
        );
      })}
    </div>
  );
}

export default function TrapmasterAIPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const [armor, setArmor] = useState(armorOptions[0]);
  const [totems, setTotems] = useState(totemOptions[0]);
  const [puller, setPuller] = useState(false);
  const [featherFalling, setFeatherFalling] = useState("Nie");

  const [nickname, setNickname] = useState("ZenciaK");
  const [skinUrl, setSkinUrl] = useState(DEFAULT_SKIN);
  const [skinLoading, setSkinLoading] = useState(false);
  const [skinMessage, setSkinMessage] = useState("");

  const [language, setLanguage] = useState("pl");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("trapmasters-language");
    if (savedLanguage) setLanguage(savedLanguage);

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setLanguage(customEvent.detail === "en" ? "en" : "pl");
    };

    window.addEventListener("trapmasters-language-change", handleLanguageChange);
    return () => window.removeEventListener("trapmasters-language-change", handleLanguageChange);
  }, []);

  const isEnglish = language === "en";

  const armorLabel = (option: string) => {
    const labels: Record<string, [string, string]> = {
      [armorOptions[0]]: ["Diax zbroja 4/3", "Diamond armor 4/3"],
      [armorOptions[1]]: ["Diax zbroja lub gorzej bez enchant\u00F3w", "Diamond armor or worse, without enchantments"],
      [armorOptions[2]]: ["Netherite 4/3", "Netherite 4/3"],
      [armorOptions[3]]: ["Ametystowa", "Amethyst armor"],
      [armorOptions[4]]: ["Szmaragdowa", "Emerald armor"],
    };
    return labels[option]?.[isEnglish ? 1 : 0] ?? option;
  };

  const totemLabel = (option: string) => {
    const labels: Record<string, [string, string]> = {
      [totemOptions[0]]: ["Nie", "No"],
      [totemOptions[1]]: ["Tak, tylko jeden", "Yes, one only"],
      [totemOptions[2]]: ["Tak, ca\u0142y ekwipunek", "Yes, a full inventory"],
      [totemOptions[3]]: ["Tak, kilka", "Yes, several"],
    };
    return labels[option]?.[isEnglish ? 1 : 0] ?? option;
  };

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [secretPlaying, setSecretPlaying] = useState(false);

  const [moneyBurst, setMoneyBurst] = useState(0);
  const [showMoney, setShowMoney] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const secretAudioRef = useRef<HTMLAudioElement>(null);
  const moneyAudioRef = useRef<HTMLAudioElement>(null);
  const bruhAudioRef = useRef<HTMLAudioElement>(null);
  const skinClicksRef = useRef<number[]>([]);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        const user = sessionData.session?.user;

        if (sessionError || !user) {
          router.replace("/register");
          return;
        }

        const { data: allowed, error: accessError } =
          await supabase.rpc("has_trapmaster_access");

        if (accessError || allowed !== true) {
          if (mounted) setHasAccess(false);
          router.replace("/");
          return;
        }

        if (mounted) setHasAccess(true);
      } catch (error) {
        console.error("BĹ‚Ä…d sprawdzania dostÄ™pu:", error);
        router.replace("/");
      } finally {
        if (mounted) setCheckingAccess(false);
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  // Odczyt wspĂłlnego ustawienia dĹşwiÄ™ku.
  useEffect(() => {
    const saved =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);

    setSoundEnabled(saved === "true");

    const handleMusicChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setSoundEnabled(Boolean(customEvent.detail));
    };

    window.addEventListener(MUSIC_EVENT, handleMusicChange);

    return () => {
      window.removeEventListener(MUSIC_EVENT, handleMusicChange);
    };
  }, []);

  // Zatrzymywanie zwykĹ‚ej muzyki i sekretnego audio po opuszczeniu strony.
  useEffect(() => {
    return () => {
      videoRef.current?.pause();

      if (secretAudioRef.current) {
        secretAudioRef.current.pause();
        secretAudioRef.current.currentTime = 0;
      }

      moneyAudioRef.current?.pause();
      bruhAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !soundEnabled || secretPlaying;
    if (secretPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [soundEnabled, secretPlaying]);

  useEffect(() => {
    if (moneyBurst === 0) return;

    setShowMoney(true);

    const timeout = window.setTimeout(() => {
      setShowMoney(false);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [moneyBurst]);

  function playEffectSound(audio: HTMLAudioElement | null) {
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error("Nie udało się odtworzyć efektu dla szmaragdowego:", error);
    });
  }

  async function toggleSecretMusic() {
    const audio = secretAudioRef.current;
    if (!audio) return;

    if (secretPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setSecretPlaying(false);
      return;
    }

    videoRef.current?.pause();

    try {
      audio.currentTime = 0;
      await audio.play();
      setSecretPlaying(true);
    } catch (error) {
      console.error("Nie udało się odtworzyć ZENEK.mp3:", error);
    }
  }

  function handleSkinClick() {
    const now = Date.now();

    skinClicksRef.current = skinClicksRef.current.filter(
      (time) => now - time < 1500
    );

    skinClicksRef.current.push(now);

    if (skinClicksRef.current.length >= 3) {
      skinClicksRef.current = [];
      void toggleSecretMusic();
    }
  }

  function loadPlayerSkin() {
    const cleanNick = nickname.trim();

    if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleanNick)) {
      setSkinMessage("Wpisz poprawny nick Minecraft (od 3 do 13 znaków).");
      return;
    }

    setSkinLoading(true);
    setSkinMessage("");

    const newSkinUrl =
      `https://mc-heads.net/skin/${encodeURIComponent(cleanNick)}`;

    const image = new Image();

    image.onload = () => {
      setSkinUrl(newSkinUrl);
      setSkinMessage("Skin zostaĹ‚ zaĹ‚adowany.");
      setSkinLoading(false);
    };

    image.onerror = () => {
      setSkinMessage("Nie udało się znaleść skina dla tego nicku.");
      setSkinLoading(false);
    };

    image.src = newSkinUrl;
  }

  function restoreDefaultSkin() {
    setSkinUrl(DEFAULT_SKIN);
    setNickname("ZenciaK");
    setSkinMessage("Przywrucono domyślnego skina.");
  }

  function selectArmor(option: string) {
    setArmor(option);

    if (option === "Szmaragdowa") {
      setMoneyBurst((previous) => previous + 1);
      playEffectSound(moneyAudioRef.current);
    }

    if (option === "Diax zbroja lub gorzej bez enchantółw") {
      playEffectSound(bruhAudioRef.current);
    }
  }

  function saveConfiguration() {
    const configuration = {
      armor,
      totems,
      puller,
      featherFalling: totems === "Nie" ? featherFalling : null,
      nickname,
      skinUrl,
    };

    sessionStorage.setItem(
      "trapmasterConfiguration",
      JSON.stringify(configuration)
    );

    alert("Konfiguracja zostaĹ‚a zapisana.");
  }

  const selectedColor = armorColors[armor];

  if (checkingAccess || !hasAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070710] text-white">
        Sprawdzanie dostępu do TRAPMASTERS...
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070710] text-white">
      <style jsx global>{`
        @keyframes moneyFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 1; }
          85% { opacity: 1; }
          100% {
            transform: translateY(115vh) rotate(540deg);
            opacity: 0;
          }
        }

        @keyframes moneyFlash {
          0% { opacity: 0; }
          12% { opacity: 0.65; }
          35% { opacity: 0.18; }
          55% { opacity: 0.35; }
          100% { opacity: 0; }
        }

        .money-symbol {
          animation-name: moneyFall;
          animation-timing-function: linear;
          animation-fill-mode: both;
          text-shadow: 0 0 12px currentColor;
        }

        .money-flash {
          background: radial-gradient(
            ellipse at center,
            rgba(52, 211, 153, 0.45),
            rgba(234, 179, 8, 0.15),
            transparent 75%
          );
          animation: moneyFlash 1.3s ease-out both;
        }
      `}</style>

      <video
        ref={videoRef}
        className="fixed inset-0 h-full w-full object-cover opacity-65"
        src="/videos/trap.mp4"
        autoPlay
        loop
        muted={!soundEnabled || secretPlaying}
        playsInline
      />

      <div className="fixed inset-0 bg-[#070710]/25" />

      <div className="pointer-events-none fixed -left-40 top-20 h-96 w-96 rounded-full bg-purple-700/20 blur-[130px]" />
      <div className="pointer-events-none fixed -right-40 bottom-10 h-96 w-96 rounded-full bg-fuchsia-600/15 blur-[130px]" />

      {showMoney && <MoneyRain burstKey={moneyBurst} />}

      <audio
        ref={secretAudioRef}
        src="/Songs/ZENEK.mp3"
        preload="auto"
        onEnded={() => setSecretPlaying(false)}
      />

      <audio ref={moneyAudioRef} src="/Songs/meney.m4a" preload="auto" />
      <audio ref={bruhAudioRef} src="/Songs/bruh.m4a" preload="auto" />

      <div className="relative z-10">
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <button
              onClick={() => {
                videoRef.current?.pause();
                secretAudioRef.current?.pause();
                moneyAudioRef.current?.pause();
                bruhAudioRef.current?.pause();
                setSecretPlaying(false);
                router.push("/");
              }}
              className="text-xl font-black tracking-[0.2em]"
            >
              <span className="text-purple-400">TRAP</span>MASTERS
            </button>

            <button
              onClick={() => router.push("/account")}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm transition hover:border-purple-400/60"
            >
              {isEnglish ? "My account" : "Moje konto"}
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 pb-8 pt-14 text-center">
          <div className="mb-5 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-bold tracking-[0.25em] text-purple-300">
            KONFIGURATOR TRAPA
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            <span className="text-purple-400">TRAP</span>MASTERS
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            Skonfiguruj przeciwnika, wybierz jego wyposarzenie i przygotuj projekt.
          </p>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-purple-400/20 bg-[#10101d]/75 p-6 backdrop-blur-md">
              <p className="text-xs font-bold tracking-[0.25em] text-purple-400">KROK 01</p>
              <h2 className="mt-2 text-2xl font-bold">{isEnglish ? "Enemy equipment" : "Wyposa\u017Cenie przeciwnika"}</h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {armorOptions.map((option) => {
                  const color = armorColors[option];
                  const selected = armor === option;

                  return (
                    <button
                      key={option}
                      onClick={() => selectArmor(option)}
                      style={{ fontFamily: armorFonts[option] }}
                      className={`flex min-h-[76px] items-center justify-between rounded-2xl border p-4 text-left transition duration-300 ${color.border} ${color.background} ${selected ? `${color.glow} scale-[1.02]` : "opacity-85 hover:opacity-100"}`}
                    >
                      <span className={`pr-3 text-sm font-semibold ${color.text}`}>{armorLabel(option)}</span>
                      <span className={`h-5 w-5 shrink-0 rounded-full border border-white/30 ${color.dot}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-purple-400/20 bg-[#10101d]/75 p-6 backdrop-blur-md">
              <p className="text-xs font-bold tracking-[0.25em] text-purple-400">KROK 02</p>
              <h2 className="mt-2 text-2xl font-bold">{isEnglish ? "Totems of undying" : "Totemy nie\u015Bmiertelno\u015Bci"}</h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {totemOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setTotems(option)}
                    style={{ fontFamily: choiceFonts.totems }}
                    className={`flex min-h-[68px] items-center justify-between rounded-2xl border p-4 text-left transition ${totems === option ? "border-purple-400 bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]" : "border-white/10 bg-white/[0.03] hover:border-purple-400/40"}`}
                  >
                    <span className="pr-3 text-sm font-semibold">{totemLabel(option)}</span>
                    <span className={`h-5 w-5 shrink-0 rounded-full border ${totems === option ? "border-purple-400 bg-purple-400" : "border-white/25"}`} />
                  </button>
                ))}
              </div>

              {totems === "Nie" && (
                <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
                  <h3 className="text-base font-bold text-amber-200" style={{ fontFamily: choiceFonts.feather }}>
                    {isEnglish ? "Does the opponent have Feather Falling IV on their boots?" : "Czy przeciwnik ma Feather Falling IV na butach?"}
                  </h3>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {["Tak", "Nie"].map((option) => (
                      <button
                        key={option}
                        onClick={() => setFeatherFalling(option)}
                        style={{ fontFamily: choiceFonts.feather }}
                        className={`rounded-xl border px-4 py-3 font-semibold transition ${featherFalling === option ? "border-amber-300 bg-amber-400/25 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.25)]" : "border-white/15 bg-black/20 hover:border-amber-300/50"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-purple-400/20 bg-[#10101d]/75 p-6 backdrop-blur-md">
              <p className="text-xs font-bold tracking-[0.25em] text-purple-400">KROK 03</p>
              <h2 className="mt-2 text-2xl font-bold">{isEnglish ? "Puller option" : "Opcja pullera"}</h2>

              <button
                onClick={() => setPuller(!puller)}
                style={{ fontFamily: choiceFonts.puller }}
                className={`mt-6 flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${puller ? "border-emerald-400 bg-emerald-500/15 shadow-[0_0_25px_rgba(52,211,153,0.25)]" : "border-white/15 bg-white/[0.03] hover:border-white/30"}`}
              >
                <div>
                  <span className="block font-semibold">Puller</span>
                  <span className="mt-1 block text-xs text-white/60">{puller ? (isEnglish ? "Option enabled" : "Opcja włączona") : (isEnglish ? "Option disabled" : "Opcja wyłączona")}</span>
                </div>

                <span className={`relative h-7 w-12 rounded-full transition ${puller ? "bg-emerald-400" : "bg-white/20"}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${puller ? "left-6" : "left-1"}`} />
                </span>
              </button>
            </div>

            <div className="rounded-3xl border border-purple-400/20 bg-[#10101d]/75 p-6 backdrop-blur-md">
              <p className="text-xs font-bold tracking-[0.25em] text-purple-400">KROK 04</p>
              <h2 className="mt-2 text-2xl font-bold">{isEnglish ? "Minecraft skin selection" : "Wyb\u00F3r skina Minecraft"}</h2>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadPlayerSkin();
                  }}
                  maxLength={16}
                  placeholder="Nick Minecraft"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-purple-400"
                />

                <button
                  onClick={loadPlayerSkin}
                  disabled={skinLoading}
                  className="rounded-xl bg-purple-500 px-6 py-3 text-sm font-bold transition hover:bg-purple-400 disabled:opacity-50"
                >
                  {skinLoading ? (isEnglish ? "Loading..." : "Wczytywanie...") : (isEnglish ? "Load skin" : "Wczytaj skin")}
                </button>
              </div>

              <button
                onClick={restoreDefaultSkin}
                className="mt-3 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/70 transition hover:border-purple-400/60"
              >
                {isEnglish ? "Restore ZenciaK default skin" : "Przywr\u00F3\u0107 domy\u015Blnego skina ZenciaK"}
              </button>

              {skinMessage && <p className="mt-3 text-sm text-purple-300">{skinMessage}</p>}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-purple-400/25 bg-[#10101d]/75 p-6 backdrop-blur-md lg:sticky lg:top-6">
            <div className="text-center">
              <p className="text-xs font-bold tracking-[0.25em] text-purple-400">{isEnglish ? "CHARACTER PREVIEW" : "PODGL\u0104D POSTACI"}</p>
              <h2 className="mt-2 text-2xl font-bold">{nickname}</h2>
              <p className="mt-1 text-xs text-white/60">{isEnglish ? "Drag to rotate the character." : "Przeci\u0105gnij, aby obr\u00F3ci\u0107 posta\u0107."}</p>
            </div>

            <div className={`mt-4 flex justify-center overflow-hidden rounded-2xl border-2 transition-all duration-500 ${selectedColor.border} ${selectedColor.background} ${selectedColor.glow}`}>
              <PlayerViewer skinUrl={skinUrl} onSkinClick={handleSkinClick} />
            </div>

            <p className="mt-3 text-center text-xs text-white/60">
              {isEnglish ? "Click the character 3 times quickly to switch the secret music." : "Kliknij posta\u0107 3 razy szybko, aby prze\u0142\u0105czy\u0107 sekretn\u0105 muzyk\u0119."}
            </p>


            <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/55">{isEnglish ? "Armor" : "Zbroja"}</span>
                <span className={`text-right font-semibold ${selectedColor.text}`}>{armorLabel(armor)}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/55">{isEnglish ? "Totems" : "Totemy"}</span>
                <span className="text-right font-semibold">{totemLabel(totems)}</span>
              </div>

              {totems === "Nie" && (
                <>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/55">Feather Falling IV</span>
                    <span className="font-semibold text-amber-200">
                      {isEnglish
                        ? (featherFalling === "Tak" ? "Yes" : "No")
                        : featherFalling}
                    </span>
                  </div>
                </>
              )}

              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/55">Puller</span>
                <span className={`font-semibold ${puller ? "text-emerald-300" : "text-white/60"}`}>
                  {puller
                    ? (isEnglish ? "Enabled" : "Włączony")
                    : (isEnglish ? "Disabled" : "Wyłączony")}
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/55">{isEnglish ? "Nickname" : "Nick"}</span>
                <span className="font-semibold">{nickname}</span>
              </div>
            </div>


            <button
              onClick={saveConfiguration}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-4 text-sm font-black tracking-wide text-white transition hover:brightness-110"
            >
              {isEnglish ? "SAVE CONFIGURATION" : "ZAPISZ KONFIGURACJ\u0118"}
            </button>
          </aside>
        </section>

        <footer className="border-t border-white/10 bg-black/20 px-6 py-6 text-center">
          <p className="text-xs tracking-wide text-white/55">Video from Lecato</p>
          <p className="mt-2 text-xs text-white/40">
            TRAPMASTERS Â© {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  );
}









