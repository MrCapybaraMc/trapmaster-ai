
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Tab = "orders" | "support" | "recruitment" | "stats" | "access" | "accounts";

type Order = {
  order_id: string;
  minecraft_nick: string;
  user_email?: string;
  status: string;
  package_type: string;
  price_m: number;
  created_at: string;
};

type SupportTicket = {
  id: string;
  user_id: string;
  user_email: string | null;
  subject: string;
  message: string;
  category?: string;
  priority?: string;
  related_order?: string | null;
  page_url?: string | null;
  status: string;
  created_at: string;
};

type Application = {
  id: string;
  user_id: string;
  user_email: string | null;
  minecraft_nick: string;
  experience: string;
  motivation: string;
  likes_zenciaka?: boolean;
  applicant_age?: number | null;
  first_name?: string | null;
  about?: string | null;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch (error) {
      console.error("Supabase client initialization failed:", error);
      setMessage("Brak konfiguracji Supabase. Sprawdź zmienne środowiskowe projektu.");
      setLoading(false);
    }
  }, []);
  const [tab, setTab] = useState<Tab>("orders");

  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [accessUsers, setAccessUsers] = useState<any[]>([]);
  const [accountUsers, setAccountUsers] = useState<any[]>([]);

  const loadOrders = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_orders");

    if (error) {
      setOrders([]);
      setMessage("Brak dostępu lub błąd pobierania zamówień.");
    } else {
      setOrders(data || []);
    }
  }, [supabase]);

  const loadTickets = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_support_tickets");

    if (error) {
      setTickets([]);
      setMessage(error.message || "Nie udało się pobrać zgłoszeń.");
    } else {
      setTickets(data || []);
    }
  }, [supabase]);

  const loadStats = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_site_stats");
    if (error) setMessage(error.message); else setStats(data?.[0] || null);
  }, [supabase]);

  const loadAccess = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_access_users");
    if (error) setMessage(error.message); else setAccessUsers(data || []);
  }, [supabase]);

  const loadAccountUsers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_account_suspension_users");
    if (error) setMessage(error.message); else setAccountUsers(data || []);
  }, [supabase]);

  const loadApplications = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc(
      "get_recruitment_applications"
    );

    if (error) {
      setApplications([]);
      setMessage(error.message || "Nie udało się pobrać rekrutacji.");
    } else {
      setApplications(data || []);
    }
  }, [supabase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage("");

    if (tab === "orders") await loadOrders();
    if (tab === "support") await loadTickets();
    if (tab === "recruitment") await loadApplications();
    if (tab === "stats") await loadStats();
    if (tab === "access") await loadAccess();
    if (tab === "accounts") await loadAccountUsers();

    setLoading(false);
  }, [tab, loadOrders, loadTickets, loadApplications, loadStats, loadAccess, loadAccountUsers]);

  useEffect(() => {
    if (supabase) void refresh();
  }, [supabase, refresh]);

  async function reviewOrder(orderId: string, decision: string) {
    if (!supabase) return;
    const question =
      decision === "approved"
        ? "Czy zaakceptować zamówienie?"
        : "Czy odrzucić zamówienie?";

    if (!window.confirm(question)) return;

    setBusyId(orderId);
    setMessage("");

    const { error } = await supabase.rpc("review_order", {
      p_order_id: orderId,
      p_decision: decision,
    });

    setMessage(
      error
        ? error.message
        : decision === "approved"
        ? "Zamówienie zaakceptowane."
        : "Zamówienie odrzucone."
    );

    setBusyId("");
    await loadOrders();
  }

  async function updateStatus(
    table: "support_tickets" | "recruitment_applications",
    id: string,
    status: string
  ) {
    if (!supabase) return;
    if (!window.confirm("Czy na pewno zmienić status zgłoszenia?")) return;

    setBusyId(id);
    setMessage("");

    const { error } = await supabase
      .from(table)
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessage(error.message || "Nie udało się zmienić statusu.");
    } else {
      setMessage("Status został zmieniony.");
      if (table === "support_tickets") await loadTickets();
      else await loadApplications();
    }

    setBusyId("");
  }

  async function changeAccess(userId: string, action: "revoke" | "restore") {
    if (!supabase) return;
    const label = action === "revoke" ? "odebrać" : "przywrócić";
    if (!window.confirm(`Czy na pewno ${label} dostęp TrapMaster temu użytkownikowi?`)) return;
    setBusyId(userId);
    const { error } = await supabase.rpc(action === "revoke" ? "revoke_trapmaster_access" : "restore_trapmaster_access", { p_user_id: userId });
    setMessage(error ? error.message : action === "revoke" ? "Dostęp został odebrany." : "Dostęp został przywrócony.");
    await loadAccess(); setBusyId("");
  }

  async function changeAccountSuspension(userId: string, suspend: boolean) {
    if (!supabase) return;
    const action = suspend ? "zablokować całe konto" : "przywrócić dostęp do całej strony";
    if (!window.confirm(`Czy na pewno chcesz ${action} temu użytkownikowi?`)) return;
    setBusyId(userId); setMessage("");
    const { error } = await supabase.rpc(suspend ? "suspend_trapmasters_account" : "restore_trapmasters_account", { p_user_id: userId });
    setMessage(error ? error.message : suspend ? "Konto zostało zablokowane." : "Dostęp do strony został przywrócony.");
    await loadAccountUsers(); setBusyId("");
  }

  async function manageUserAccount(userId: string, action: "delete" | "reset_password") {
    if (!supabase) return;
    const target = accountUsers.find((user) => user.user_id === userId);
    if (!target) return;

    const confirmed = action === "delete"
      ? window.confirm(`Czy na pewno trwale usunąć konto ${target.email || target.display_name}? Tej operacji nie można cofnąć.`)
      : window.confirm(`Wysłać ${target.email || "użytkownikowi"} wiadomość z linkiem do ustawienia nowego hasła?`);
    if (!confirmed) return;

    setBusyId(userId);
    setMessage("");
    const { data, error } = await supabase.functions.invoke("admin-account-management", {
      body: { action, user_id: userId },
    });

    if (error) {
      setMessage(error.message || "Nie udało się wykonać operacji.");
    } else {
      setMessage(data?.message || "Operacja zakończona.");
      if (action === "delete") await loadAccountUsers();
    }
    setBusyId("");
  }

  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "Oczekujące",
      approved: "Zaakceptowane",
      rejected: "Odrzucone",
      open: "Otwarte",
      in_progress: "W trakcie",
      closed: "Zamknięte",
      accepted: "Zaakceptowane",
    };

    return labels[status] || status;
  }

  const buttonClass = (active: boolean) =>
    `rounded-xl px-5 py-3 font-bold transition ${
      active
        ? "bg-cyan-400 text-black"
        : "bg-white/10 text-white hover:bg-white/20"
    }`;

  function VideoBackground() {
    return (
      <>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="fixed inset-0 w-full h-full object-cover -z-20"
        >
          <source src="/videos/for.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-[#050811]/75 -z-10" />
      </>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#080b12] text-white p-5 md:p-10">
      {(tab === "support" || tab === "recruitment") && (
        <VideoBackground />
      )}

      <div className="max-w-6xl mx-auto relative">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-sm text-cyan-400 font-bold tracking-widest">
              TRAPMASTERS
            </p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">
              Panel administratora
            </h1>
            <p className="text-gray-300 mt-2">
              Zarządzaj zamówieniami i zgłoszeniami użytkowników.
            </p>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-black font-bold px-5 py-3"
          >
            {loading ? "Ładowanie..." : "Odśwież"}
          </button>
        </header>

        <nav className="flex flex-wrap gap-3 mb-7">
          <button
            className={buttonClass(tab === "orders")}
            onClick={() => setTab("orders")}
          >
            Zamówienia ({orders.length})
          </button>

          <button
            className={buttonClass(tab === "support")}
            onClick={() => setTab("support")}
          >
            Zgłoszenia ({tickets.length})
          </button>

          <button className={buttonClass(tab === "recruitment")} onClick={() => setTab("recruitment")}>Zgłoszenia rekrutacyjne ({applications.length})</button>
          <button className={buttonClass(tab === "stats")} onClick={() => setTab("stats")}>Statystyki</button>
          <button className={buttonClass(tab === "access")} onClick={() => setTab("access")}>Dostęp TrapMaster</button>
          <button className={buttonClass(tab === "accounts")} onClick={() => setTab("accounts")}>Zarządzanie kontami</button>
        </nav>

        {message && (
          <div className="mb-5 rounded-xl border border-white/10 bg-black/50 p-4">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-black/40 border border-white/10 p-8">
            Pobieranie danych...
          </div>
        ) : (
          <>
            {tab === "stats" && (
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat title="Wszystkie odwiedziny" value={Number(stats?.total_visits || 0)} />
                <Stat title="Dzisiaj" value={Number(stats?.today_visits || 0)} />
                <Stat title="Ostatnie 7 dni" value={Number(stats?.week_visits || 0)} />
                <Stat title="Zarejestrowane konta" value={Number(stats?.registered_users || 0)} />
                <Stat title="Zatwierdzone zamówienia" value={Number(stats?.approved_orders || 0)} />
              </section>
            )}

            {tab === "accounts" && (
              <section className="rounded-2xl border border-white/10 bg-black/40 p-5 md:p-7">
                <h2 className="mb-2 text-2xl font-bold">Zarządzanie kontami użytkowników</h2>
                <p className="mb-6 text-sm text-gray-400">Możesz blokować konta zwykłych użytkowników, wysłać im bezpieczny link do ustawienia nowego hasła lub trwale usunąć konto. Konta administratorów i właściciela są chronione.</p>
                <div className="space-y-3">
                  {accountUsers.map((u) => (
                    <article key={u.user_id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div><p className="font-bold">{u.display_name}</p><p className="text-xs text-gray-400">{u.email || u.user_id}</p><p className="mt-1 text-xs text-gray-500">{u.suspended ? `Konto zablokowane · ${u.suspended_at ? new Date(u.suspended_at).toLocaleString("pl-PL") : ""}` : "Konto aktywne"}</p></div>
                      <div className="flex flex-wrap gap-2">
                        <button disabled={busyId === u.user_id} onClick={() => manageUserAccount(u.user_id, "reset_password")} className="rounded-xl bg-cyan-600 px-4 py-3 font-bold disabled:opacity-50">Resetuj hasło e-mailem</button>
                        <button disabled={busyId === u.user_id} onClick={() => manageUserAccount(u.user_id, "delete")} className="rounded-xl bg-red-700 px-4 py-3 font-bold disabled:opacity-50">Usuń konto</button>
                        <button disabled={busyId === u.user_id} onClick={() => changeAccountSuspension(u.user_id, !u.suspended)} className={u.suspended ? "rounded-xl bg-green-600 px-4 py-3 font-bold disabled:opacity-50" : "rounded-xl bg-red-600 px-4 py-3 font-bold disabled:opacity-50"}>{u.suspended ? "Odblokuj konto" : "Zablokuj konto"}</button>
                      </div>
                    </article>
                  ))}
                  {accountUsers.length === 0 && <p className="text-gray-400">Brak kont do wyświetlenia.</p>}
                </div>
              </section>
            )}

            {tab === "access" && (
              <section className="rounded-2xl border border-white/10 bg-black/40 p-5 md:p-7">
                <h2 className="mb-2 text-2xl font-bold">Zarządzanie dostępem</h2>
                <p className="mb-6 text-sm text-gray-400">Możesz odebrać lub przywrócić dostęp użytkownikowi. Konta administratorów i właściciela są chronione.</p>
                <div className="space-y-3">
                  {accessUsers.map((u) => (
                    <article key={u.user_id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div><p className="font-bold">{u.display_name}</p><p className="text-xs text-gray-400">{u.email || u.user_id}</p><p className="mt-1 text-xs text-gray-500">{u.access_type} · {u.revoked ? "Dostęp odebrany" : u.expires_at ? new Date(u.expires_at).toLocaleString("pl-PL") : "Bezterminowy"}</p></div>
                      <button disabled={busyId === u.user_id} onClick={() => changeAccess(u.user_id, u.revoked ? "restore" : "revoke")} className={u.revoked ? "rounded-xl bg-green-600 px-4 py-3 font-bold disabled:opacity-50" : "rounded-xl bg-red-600 px-4 py-3 font-bold disabled:opacity-50"}>{u.revoked ? "Przywróć dostęp" : "Odbierz dostęp"}</button>
                    </article>
                  ))}
                  {accessUsers.length === 0 && <p className="text-gray-400">Brak użytkowników z aktywnym lub odebranym dostępem.</p>}
                </div>
              </section>
            )}

            {tab === "orders" && (
              <>
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <Stat title="Wszystkie zamówienia" value={orders.length} />
                  <Stat
                    title="Oczekujące"
                    value={orders.filter((o) => o.status === "pending").length}
                  />
                  <Stat
                    title="Zaakceptowane"
                    value={orders.filter((o) => o.status === "approved").length}
                  />
                </section>

                <section className="rounded-2xl bg-white/5 border border-white/10 p-5 md:p-7">
                  <h2 className="text-2xl font-bold mb-5">Zamówienia</h2>

                  {orders.length === 0 ? (
                    <p className="text-gray-300">Brak zamówień.</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <article
                          key={order.order_id}
                          className="rounded-xl border border-white/10 bg-black/30 p-5"
                        >
                          <div className="flex flex-wrap justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold">
                                {order.minecraft_nick}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                {order.user_email || "Brak adresu e-mail"}
                              </p>
                            </div>
                            <Status status={order.status} label={statusLabel(order.status)} />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 text-sm">
                            <Info title="Pakiet" value={order.package_type} />
                            <Info title="Cena" value={`${order.price_m}m`} />
                            <Info
                              title="Data"
                              value={new Date(order.created_at).toLocaleString("pl-PL")}
                            />
                          </div>

                          {order.status === "pending" && (
                            <div className="flex flex-wrap gap-3 mt-5">
                              <button
                                onClick={() => reviewOrder(order.order_id, "approved")}
                                disabled={busyId === order.order_id}
                                className="rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 px-5 py-3 font-bold"
                              >
                                Przyjmij zamówienie
                              </button>
                              <button
                                onClick={() => reviewOrder(order.order_id, "rejected")}
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
              </>
            )}

            {tab === "support" && (
              <section className="rounded-2xl bg-black/45 backdrop-blur-md border border-white/20 p-5 md:p-7">
                <h2 className="text-2xl font-bold mb-2">Zgłoszenia użytkowników</h2>
                <p className="text-gray-300 mb-6">
                  Wiadomości wysłane przez użytkowników strony.
                </p>

                {tickets.length === 0 ? (
                  <p className="text-gray-300">Nie ma jeszcze zgłoszeń.</p>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <article
                        key={ticket.id}
                        className="rounded-xl border border-white/15 bg-black/40 p-5"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold">{ticket.subject}</h3>
                            <p className="mt-1 text-xs text-cyan-200">Kategoria: {ticket.category || "inne"} · Priorytet: {ticket.priority || "normalny"}</p>
                            {ticket.related_order && <p className="mt-1 text-xs text-gray-400">Zamówienie: {ticket.related_order}</p>}
                            {ticket.page_url && <p className="mt-1 break-all text-xs text-gray-500">Strona: {ticket.page_url}</p>}
                            <p className="text-sm text-cyan-300 mt-1">
                              {ticket.user_email || "Brak e-maila"}
                            </p>
                          </div>
                          <Status status={ticket.status} label={statusLabel(ticket.status)} />
                        </div>

                        <p className="whitespace-pre-wrap text-gray-200 mt-5">
                          {ticket.message}
                        </p>

                        <p className="text-xs text-gray-400 mt-4">
                          {new Date(ticket.created_at).toLocaleString("pl-PL")}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-5">
                          <Action
                            label="W trakcie"
                            onClick={() => updateStatus("support_tickets", ticket.id, "in_progress")}
                            busy={busyId === ticket.id}
                          />
                          <Action
                            label="Zamknij"
                            onClick={() => updateStatus("support_tickets", ticket.id, "closed")}
                            busy={busyId === ticket.id}
                          />
                          <Action
                            label="Otwórz ponownie"
                            onClick={() => updateStatus("support_tickets", ticket.id, "open")}
                            busy={busyId === ticket.id}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "recruitment" && (
              <section className="rounded-2xl bg-black/45 backdrop-blur-md border border-white/20 p-5 md:p-7">
                <h2 className="text-2xl font-bold mb-2">
                  Zgłoszenia rekrutacyjne
                </h2>
                <p className="text-gray-300 mb-6">
                  Podania osób zainteresowanych administracją strony.
                </p>

                {applications.length === 0 ? (
                  <p className="text-gray-300">Nie ma jeszcze podań.</p>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <article
                        key={application.id}
                        className="rounded-xl border border-white/15 bg-black/40 p-5"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold">
                              {application.minecraft_nick}
                            </h3>
                            <p className="text-sm text-cyan-300 mt-1">
                              {application.user_email || "Brak e-maila"}
                            </p>
                          </div>
                          <Status
                            status={application.status}
                            label={statusLabel(application.status)}
                          />
                        </div>

                        <div className="mt-5 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                          <p><span className="font-bold text-cyan-300">Imię:</span> {application.first_name || "—"}</p>
                          <p><span className="font-bold text-cyan-300">Wiek:</span> {application.applicant_age ?? "—"}</p>
                          <p><span className="font-bold text-cyan-300">Czy lubi zenciaka:</span> {application.likes_zenciaka ? "Tak" : application.likes_zenciaka === false ? "Nie" : "—"}</p>
                        </div>
                        {application.about && <div className="mt-5"><p className="mb-1 font-bold text-cyan-300">O sobie</p><p className="whitespace-pre-wrap text-gray-200">{application.about}</p></div>}
                        <div className="mt-5">
                          <p className="text-cyan-300 font-bold mb-1">Doświadczenie</p>
                          <p className="whitespace-pre-wrap text-gray-200">
                            {application.experience}
                          </p>
                        </div>

                        <div className="mt-5">
                          <p className="text-cyan-300 font-bold mb-1">Motywacja</p>
                          <p className="whitespace-pre-wrap text-gray-200">
                            {application.motivation}
                          </p>
                        </div>

                        <p className="text-xs text-gray-400 mt-4">
                          {new Date(application.created_at).toLocaleString("pl-PL")}
                        </p>

                        <div className="flex flex-wrap gap-3 mt-5">
                          <button
                            onClick={() => updateStatus("recruitment_applications", application.id, "accepted")}
                            disabled={busyId === application.id}
                            className="rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-3 font-bold"
                          >
                            Przyjmij
                          </button>
                          <button
                            onClick={() => updateStatus("recruitment_applications", application.id, "rejected")}
                            disabled={busyId === application.id}
                            className="rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-3 font-bold"
                          >
                            Odrzuć
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <p className="text-gray-400">{title}</p>
      <p className="text-3xl font-black mt-2">{value}</p>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Status({ status, label }: { status: string; label: string }) {
  const color =
    status === "approved" || status === "accepted"
      ? "bg-green-500/20 text-green-300"
      : status === "rejected"
      ? "bg-red-500/20 text-red-300"
      : status === "closed"
      ? "bg-gray-500/20 text-gray-300"
      : "bg-yellow-500/20 text-yellow-300";

  return (
    <span className={`h-fit rounded-lg px-3 py-1 text-sm font-bold ${color}`}>
      {label}
    </span>
  );
}

function Action({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 px-4 py-3 font-bold"
    >
      {label}
    </button>
  );
}
