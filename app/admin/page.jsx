
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function AdminPage() {
  const [supabase] = useState(() => createClient());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("get_orders");

    if (error) {
      setOrders([]);
      setMessage("Brak dostępu do panelu lub błąd pobierania zamówień.");
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function reviewOrder(orderId, decision) {
    const question =
      decision === "approved"
        ? "Czy na pewno chcesz zaakceptować to zamówienie?"
        : "Czy na pewno chcesz odrzucić to zamówienie?";

    if (!window.confirm(question)) return;

    setBusyId(orderId);
    setMessage("");

    const { error } = await supabase.rpc("review_order", {
      p_order_id: orderId,
      p_decision: decision,
    });

    if (error) {
      setMessage(error.message || "Nie udało się rozpatrzyć zamówienia.");
    } else {
      setMessage(
        decision === "approved"
          ? "Zamówienie zostało zaakceptowane."
          : "Zamówienie zostało odrzucone."
      );
    }

    setBusyId(null);
    await loadOrders();
  }

  function statusLabel(status) {
    if (status === "pending") return "Oczekujące";
    if (status === "approved") return "Zaakceptowane";
    if (status === "rejected") return "Odrzucone";
    return status;
  }

  return (
    <main className="min-h-screen bg-[#080b12] text-white p-5 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-cyan-400 font-bold tracking-widest">
              TRAPMASTERS
            </p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">
              Panel administratora
            </h1>
            <p className="text-gray-400 mt-2">
              Zarządzaj zamówieniami klientów.
            </p>
          </div>

          <button
            onClick={loadOrders}
            disabled={loading}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold px-5 py-3"
          >
            {loading ? "Ładowanie..." : "Odśwież zamówienia"}
          </button>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
            {message}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="text-gray-400">Wszystkie zamówienia</p>
            <p className="text-3xl font-black mt-2">{orders.length}</p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="text-gray-400">Oczekujące</p>
            <p className="text-3xl font-black text-yellow-400 mt-2">
              {orders.filter((o) => o.status === "pending").length}
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="text-gray-400">Zaakceptowane</p>
            <p className="text-3xl font-black text-green-400 mt-2">
              {orders.filter((o) => o.status === "approved").length}
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-5 md:p-7">
          <h2 className="text-2xl font-bold mb-5">Zamówienia</h2>

          {loading ? (
            <p className="text-gray-400">Pobieranie zamówień...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-400">Nie ma jeszcze żadnych zamówień.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article
                  key={order.order_id}
                  className="rounded-xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">
                        {order.minecraft_nick}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {order.user_email || "Brak adresu e-mail"}
                      </p>
                    </div>

                    <span
                      className={`h-fit rounded-lg px-3 py-1 text-sm font-bold ${
                        order.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-300"
                          : order.status === "approved"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 text-sm">
                    <div>
                      <p className="text-gray-500">Pakiet</p>
                      <p className="font-bold">{order.package_type}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Cena</p>
                      <p className="font-bold">{order.price_m}M</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Data zamówienia</p>
                      <p className="font-bold">
                        {new Date(order.created_at).toLocaleString("pl-PL")}
                      </p>
                    </div>
                  </div>

                  {order.status === "pending" && (
                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        onClick={() =>
                          reviewOrder(order.order_id, "approved")
                        }
                        disabled={busyId === order.order_id}
                        className="rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 px-5 py-3 font-bold"
                      >
                        {busyId === order.order_id
                          ? "Przetwarzanie..."
                          : "Przyjmij zamówienie"}
                      </button>

                      <button
                        onClick={() =>
                          reviewOrder(order.order_id, "rejected")
                        }
                        disabled={busyId === order.order_id}
                        className="rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 px-5 py-3 font-bold"
                      >
                        Odrzuć
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}