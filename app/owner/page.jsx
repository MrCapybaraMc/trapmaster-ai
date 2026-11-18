
"use client";

const [hasTrapperAccess, setHasTrapperAccess] = useState(false);
const [musicEnabled, setMusicEnabled] = useState(false);
const [musicStarted, setMusicStarted] = useState(false);
const backgroundVideoRef = useRef<HTMLVideoElement>(null);
import { createClient } from "../../lib/supabase/client";

export default function OwnerPage() {
  const [supabase] = useState(() => createClient());
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(false);

  async function loadAdmins() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("get_admin_users");

    if (error) {
      setAllowed(false);
      setMessage("Brak dostępu do panelu właściciela.");
      setLoading(false);
      return;
    }

    setAllowed(true);
    setAdmins(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function changeRole(role) {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Wpisz adres e-mail użytkownika.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("set_admin_role", {
      p_email: cleanEmail,
      p_role: role,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        role === "admin"
          ? "Administrator został dodany."
          : "Administrator został usunięty."
      );
      setEmail("");
      await loadAdmins();
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#080b12] p-5 text-white">
      <div className="mx-auto max-w-5xl">
        <a
          href="/"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Powrót na stronę główną
        </a>

        <header className="mb-8 mt-8">
          <p className="font-bold tracking-widest text-yellow-400">
            TRAPMASTERS
          </p>
          <h1 className="mt-2 text-4xl font-black">
            PANEL WŁAŚCICIELA
          </h1>
          <p className="mt-2 text-gray-400">
            Zarządzaj administratorami swojej strony.
          </p>
        </header>

        {!loading && !allowed ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="text-xl font-bold text-red-400">
              Brak dostępu
            </h2>
            <p className="mt-2 text-gray-300">
              To miejsce jest dostępne tylko dla właściciela.
              Zaloguj się na właściwe konto.
            </p>
          </div>
        ) : loading ? (
          <p className="text-gray-400">Ładowanie panelu...</p>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <h2 className="text-xl font-bold">
                Zarządzanie administratorami
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Wpisz e-mail konta zarejestrowanego na TRAPMASTERS.
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email użytkownika"
                className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-500"
              />

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={() => changeRole("admin")}
                  disabled={saving}
                  className="rounded-xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-500 disabled:opacity-50"
                >
                  {saving ? "Chwilka..." : "Nadaj administratora"}
                </button>

                <button
                  onClick={() => changeRole("remove")}
                  disabled={saving}
                  className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3 font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Odbierz administratora
                </button>
              </div>

              {message && (
                <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-gray-300">
                  {message}
                </p>
              )}
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-[#111827] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Lista administratorów i właścicieli
                </h2>

                <button
                  onClick={loadAdmins}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Odśwież
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.email}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <span className="break-all text-gray-200">
                      {admin.email}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        admin.role === "owner"
                          ? "bg-yellow-500/15 text-yellow-300"
                          : "bg-purple-500/15 text-purple-300"
                      }`}
                    >
                      {admin.role.toUpperCase()}
                    </span>
                  </div>
                ))}

                {admins.length === 0 && (
                  <p className="text-gray-400">
                    Brak administratorów.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
