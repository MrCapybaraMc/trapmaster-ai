
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "trapmasters_music_enabled";

export default function MusicToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const frame = window.requestAnimationFrame(() => {
      setEnabled(saved === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleMusic() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));

    window.dispatchEvent(
      new CustomEvent("trapmasters-music-change", {
        detail: next,
      })
    );
  }

  return (
    <button
      type="button"
      onClick={toggleMusic}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 99999,
        padding: "12px 18px",
        borderRadius: 12,
        border: "1px solid #555",
        background: "#111",
        color: "white",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      {enabled ? "🔊 Dźwięk: WŁĄCZONY" : "🔇 Dźwięk: WYŁĄCZONY"}
    </button>
  );
}
