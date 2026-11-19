
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Admin = {
  user_id: string;
  email?: string;
  role: string;
  created_at?: string;
};

type Gift = {
  id: string;
  email: string;
  days: number;
  created_at: string;
  expires_at: string;
  status: string;
  granted_by: string;
};

export default function OwnerPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"admins" | "gifts">("admins");

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);

  const [adminEmail, setAdminEmail] = useState("");
  const [giftEmail, setGiftEmail] = useState("");
  const [giftDays, setGiftDays] = useState("7");

  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const checkOwner = useCallback(async () => {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      router.replace("/register");
      return false;
    }

    const { data, error: ownerError } =
      await supabase.rpc("is_owner");

    if (ownerError || data !== true) {
      router.replace("/");
      return false;
    }

    setAuthorized(true);
    return true;
  }, [supabase, router]);

  const loadAdmins = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_admin_users");

    if (error) {
      throw error;
    }

    setAdmins((data ?? []) as Admin[]);
  }, [supabase]);

  const loadGifts = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_gifts");

    if (error) {
      throw error;
    }

    setGifts((data ?? []) as Gift[]);
  }, [supabase]);

  const refreshData = useCallback(async () => {
    setError("");

    try {
      await Promise.all([loadAdmins(), loadGifts()]);
    } catch (err) {
      console.error("Błąd pobierania danych:", err);
      setError("Nie udało się pobrać danych. Spróbuj ponownie.");
    }
  }, [loadAdmins, loadGifts]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const allowed = await checkOwner();

        if (!mounted || !allowed) return;

        await refreshData();
      } catch (err) {
        console.error("Błąd panelu Owner:", err);
        if (mounted) setError("Wystąpił błąd podczas ładowania panelu.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [checkOwner, refreshData]);

  async function changeAdminRole(role: "admin" | "remove") {
    if (!adminEmail.trim()) {
      setError("Wpisz adres e-mail użytkownika.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("set_admin_role", {
        p_email: adminEmail.trim(),
        p_role: role,
      });

      if (error) throw error;

      if (data === false) {
        throw new Error("Operacja nie została wykonana.");
      }

      setMessage(
        role === "admin"
          ? "Nadano rolę administratora."
          : "Wysłano polecenie odebrania roli administratora."
      );

      setAdminEmail("");
      await loadAdmins();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się zmienić roli użytkownika."
      );
    } finally {
      setWorking(false);
    }
  }

  async function grantGift() {
    const days = Number(giftDays);

    if (!giftEmail.trim()) {
      setError("Wpisz adres e-mail użytkownika.");
      return;
    }

    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setError("Liczba dni musi wynosić od 1 do 3650.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("grant_gift", {
        p_email: giftEmail.trim(),
        p_days: days,
      });

      if (error) throw error;

      if (data?.success === false) {
        throw new Error(data.message || "Nie udało się przyznać Giftu.");
      }

      setMessage(`Przyznano dostęp TrapMaster na ${days} dni.`);
      setGiftEmail("");
      await loadGifts();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się przyznać dostępu."
      );
    } finally {
      setWorking(false);
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b12] flex items-center justify-center text-white">
        <p className="text-lg">Ładowanie panelu Owner...</p>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-[#080b12] text-white px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-red-400 uppercase tracking-[0.3em] text-xs font-bold">
              TRAPMASTERS
            </p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">
              Panel Owner
            </h1>
            <p className="text-gray-400 mt-2">
              Zarządzanie administratorami i dostępami TrapMaster.
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/15 px-5 py-3 hover:bg-white/10 transition"
          >
            Powrót na stronę
          </button>
        </header>

        <nav className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setActiveTab("admins")}
            className={`rounded-xl px-5 py-3 font-bold transition ${
              activeTab === "admins"
                ? "bg-red-600 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Administratorzy
          </button>

          <button
            onClick={() => setActiveTab("gifts")}
            className={`rounded-xl px-5 py-3 font-bold transition ${
              activeTab === "gifts"
                ? "bg-red-600 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Gifty i dostępy
          </button>

          <button
            onClick={refreshData}
            disabled={working}
            className="rounded-xl px-5 py-3 bg-white/5 text-gray-300 hover:bg-white/10 transition disabled:opacity-50"
          >
            Odśwież dane
          </button>
        </nav>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            {message}
          </div>
        )}

        {activeTab === "admins" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
              <h2 className="text-xl font-bold mb-2">
                Zarządzanie administratorami
              </h2>

              <p className="text-gray-400 text-sm mb-5">
                Wpisz e-mail konta, któremu chcesz nadać lub odebrać rolę
                administratora.
              </p>

              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Adres e-mail użytkownika"
                  className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-red-500"
                />

                <button
                  disabled={working}
                  onClick={() => changeAdminRole("admin")}
                  className="rounded-xl bg-red-600 hover:bg-red-500 px-5 py-3 font-bold disabled:opacity-50"
                >
                  Nadaj admina
                </button>

                <button
                  disabled={working}
                  onClick={() => changeAdminRole("remove")}
                  className="rounded-xl bg-white/10 hover:bg-white/15 px-5 py-3 font-bold disabled:opacity-50"
                >
                  Odbierz rolę
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
              <h2 className="text-xl font-bold mb-5">
                Lista administratorów
              </h2>

              {admins.length === 0 ? (
                <p className="text-gray-400">
                  Nie znaleziono administratorów.
                </p>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.user_id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/25 border border-white/5 p-4"
                    >
                      <div>
                        <p className="font-bold">
                          {admin.email || "Użytkownik"}
                        </p>
                        <p className="text-xs text-gray-500 break-all">
                          ID: {admin.user_id}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          admin.role === "owner"
                            ? "bg-yellow-500/15 text-yellow-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {admin.role === "owner" ? "OWNER" : "ADMIN"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "gifts" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
              <h2 className="text-xl font-bold mb-2">
                Przyznaj dostęp TrapMaster
              </h2>

              <p className="text-gray-400 text-sm mb-5">
                Użytkownik otrzyma dostęp do konfiguratora na wybraną liczbę
                dni. Konto musi już istnieć w serwisie.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
                <input
                  type="email"
                  value={giftEmail}
                  onChange={(e) => setGiftEmail(e.target.value)}
                  placeholder="E-mail użytkownika"
                  className="min-w-0 rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-red-500"
                />

                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={giftDays}
                  onChange={(e) => setGiftDays(e.target.value)}
                  placeholder="Liczba dni"
                  className="rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-red-500"
                />

                <button
                  disabled={working}
                  onClick={grantGift}
                  className="rounded-xl bg-red-600 hover:bg-red-500 px-5 py-3 font-bold disabled:opacity-50"
                >
                  Przyznaj Gift
                </button>
              </div>

              <p className="text-gray-500 text-xs mt-3">
                Maksymalny okres jednego Giftu: 3650 dni.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
              <h2 className="text-xl font-bold mb-5">
                Historia przyznanych Giftów
              </h2>

              {gifts.length === 0 ? (
                <p className="text-gray-400">
                  Nie przyznano jeszcze żadnych Giftów.
                </p>
              ) : (
                <div className="space-y-3">
                  {gifts.map((gift) => {
                    const active =
                      gift.status === "active" &&
                      new Date(gift.expires_at).getTime() > Date.now();

                    return (
                      <div
                        key={gift.id}
                        className="rounded-xl bg-black/25 border border-white/5 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold break-all">
                              {gift.email}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Okres: {gift.days} dni
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              active
                                ? "bg-green-500/15 text-green-300"
                                : "bg-gray-500/15 text-gray-400"
                            }`}
                          >
                            {active ? "AKTYWNY" : "WYGASŁY"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-xs text-gray-500">
                          <p>
                            Przyznano: {formatDate(gift.created_at)}
                          </p>
                          <p>
                            Wygasa: {formatDate(gift.expires_at)}
                          </p>
                        </div>

                        <p className="text-xs text-gray-600 mt-2 break-all">
                          ID Giftu: {gift.id}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="text-center text-gray-600 text-xs mt-12">
          TRAPMASTERS · Panel Owner
        </footer>
      </div>
    </main>
  );
}
