"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function DeleteButton({
  endpoint,
  redirectTo,
  message,
  className,
  children,
}: {
  endpoint: string;
  redirectTo: string;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    if (!confirm(message)) return;
    setBusy(true);
    setError("");
    try {
      await api(endpoint, "DELETE");
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete nahi ho saka");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={onClick} disabled={busy} className={className}>
        {busy ? "Ruko..." : children}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
