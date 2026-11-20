"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("TrapMasters page render error:", error);
  }, [error]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#080b12", color: "white", fontFamily: "system-ui" }}>
      <section style={{ maxWidth: 520, textAlign: "center" }}>
        <p style={{ color: "#67e8f9", fontWeight: 800, letterSpacing: 3 }}>TRAPMASTERS</p>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginTop: 16 }}>Nie udało się załadować tej części strony</h1>
        <p style={{ color: "#cbd5e1", marginTop: 12 }}>Wystąpił błąd aplikacji. Spróbuj ponownie lub otwórz test serwera.</p>
        {error?.digest && <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 12 }}>Kod błędu: {error.digest}</p>}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <button onClick={() => reset()} style={{ borderRadius: 12, padding: "12px 18px", background: "#0891b2", color: "white", fontWeight: 800 }}>Spróbuj ponownie</button>
          <a href="/health" style={{ borderRadius: 12, padding: "12px 18px", background: "#1e293b", color: "white", fontWeight: 800, textDecoration: "none" }}>Test serwera</a>
        </div>
      </section>
    </main>
  );
}
