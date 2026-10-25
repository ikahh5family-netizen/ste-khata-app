"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ ok: boolean; result?: string }>("/api/seed", "POST");
      if (r.result === "exists") setError("Data pehle se hai");
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load Demo Data nahi ho saka");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={load} disabled={busy} className="btn-primary">
        {busy ? "Loading..." : "Load Demo Data"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
