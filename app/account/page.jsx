
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, minecraft_nick, package_type, price_m, status, created_at, expires_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Nie udało się pobrać zamówień. Spróbuj ponownie.");
      setOrders([]);
    } else {
      setMessage("");
      setOrders(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data.user);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, minecraft_nick, package_type, price_m, status, created_at, expires_at"
        )
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (orderError) {
        setMessage("Nie udało się pobrać zamówień. Spróbuj ponownie.");
      } else {
        setOrders(orderData || []);
      }

      setLoading(false);
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user || null);

      if (!session?.user) {
        setOrders([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Nie udało się wylogować. Spróbuj ponownie.");
      setSigningOut(false);
      return;
    }

    window.location.href = "/";
  }

  function statusLabel(status) {
    if (status === "pending") return "Oczekujące";
    if (status === "approved") return "Zaakceptowane";
    if (status === "rejected") return "Odrzucone";
    return status;
  }

  function statusStyle(status) {
    if (status === "pending") {
      return "bg-yellow-500/15 text-yellow-300 border-yellow-400/30";
    }

    if (status === "approved") {
      return "bg-green-500/15 text-green-300 border-green-400/30";
    }

    return "bg-red-500/15 text-red-300 border-red-400/30";
  }

  function packageLabel(type) {
    if (type === "week") return "Tydzień";
    if (type === "month") return "Miesiąc";
    if (type === "forever") return "Na zawsze";
    return type;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070910] text-white flex items-center justify-center">
        Ładowanie konta...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#070910] text-white flex items-center justify-center px-5">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-3xl font-black">Moje konto</h1>
          <p className="mt-4 text-gray-400">
            Aby zobaczyć swoje konto i zamówienia, musisz się zalogować.
          </p>
          <a
            href="/register"
            className="mt-7 inline-block rounded-xl bg-purple-600 px-8 py-4 font-bold hover:bg-purple-500"
          >
            ZALOGUJ SIĘ
          </a>
          <a
            href="/"
            className="mt-5 block text-sm text-gray-400 underline"
          >
            Wróć na stronę główną
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070910] text-white px-5 py-10 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-7">
          <div>
            <a href="/" className="text-xl font-black tracking-wider">
              TRAP<span className="text-purple-500">MASTERS</span>
            </a>
            <h1 className="mt-5 text-4xl font-black">Moje konto</h1>
            <p className="mt-2 text-gray-400">
              Zarządzaj swoim kontem i sprawdzaj zamówienia.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            {signingOut ? "Wylogowywanie..." : "Wyloguj się"}
          </button>
        </header>

        <section className="mt-8 rounded-2xl border border-purple-400/20 bg-purple-950/20 p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-purple-300">
            Informacje o koncie
          </p>
          <p className="mt-4 text-sm text-gray-400">Zalogowany użytkownik</p>
          <p className="mt-1 break-all text-lg font-bold">{user.email}</p>
          <p className="mt-4 text-sm text-gray-400">
            Liczba Twoich zamówień:{" "}
            <span className="font-bold text-white">{orders.length}</span>
          </p>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black">Moje zamówienia</h2>
              <p className="mt-2 text-gray-400">
                Tutaj znajdziesz historię swoich zakupów.
              </p>
            </div>

            <button
              onClick={loadOrders}
              className="rounded-xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-500"
            >
              Odśwież
            </button>
          </div>

          {message && (
            <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">
              {message}
            </div>
          )}

          {orders.length === 0 && !message ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="text-4xl">📦</div>
              <h3 className="mt-4 text-xl font-bold">
                Nie masz jeszcze zamówień
              </h3>
              <p className="mt-2 text-gray-400">
                Wybierz pakiet na stronie głównej, aby złożyć pierwsze zamówienie.
              </p>
              <a
                href="/#oferta"
                className="mt-6 inline-block rounded-xl bg-purple-600 px-7 py-3 font-bold"
              >
                ZOBACZ OFERTĘ
              </a>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-400">
                        Nick Minecraft
                      </p>
                      <h3 className="mt-1 text-2xl font-black">
                        {order.minecraft_nick}
                      </h3>
                    </div>

                    <span
                      className={`rounded-lg border px-4 py-2 text-sm font-bold ${statusStyle(
                        order.status
                      )}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-gray-400">Pakiet</p>
                      <p className="mt-1 font-bold">
                        {packageLabel(order.package_type)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400">Cena</p>
                      <p className="mt-1 font-bold">{order.price_m}M</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400">
                        Data zamówienia
                      </p>
                      <p className="mt-1 font-bold">
                        {new Date(order.created_at).toLocaleString("pl-PL")}
                      </p>
                    </div>
                  </div>

                  {order.expires_at && order.status === "approved" && (
                    <p className="mt-5 text-sm text-gray-400">
                      Dostęp wygasa:{" "}
                      <span className="font-bold text-white">
                        {new Date(order.expires_at).toLocaleString("pl-PL")}
                      </span>
                    </p>
                  )}

                  {order.status === "pending" && (
                    <p className="mt-5 text-sm text-yellow-200">
                      Twoje zamówienie czeka na sprawdzenie płatności przez administrację.
                    </p>
                  )}

                  {order.status === "approved" && (
                    <p className="mt-5 text-sm text-green-200">
                      Zamówienie zostało zaakceptowane.
                    </p>
                  )}

                  {order.status === "rejected" && (
                    <p className="mt-5 text-sm text-red-200">
                      Zamówienie zostało odrzucone. W razie pytań skontaktuj się z administracją.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-14 border-t border-white/10 pt-7 text-center">
          <a href="/" className="text-sm text-gray-400 underline">
            Wróć na stronę główną
          </a>
          <p className="mt-4 text-xs text-gray-600">
            © 2026 TRAPMASTERS
          </p>
        </footer>
      </div>
    </main>
  );
}
