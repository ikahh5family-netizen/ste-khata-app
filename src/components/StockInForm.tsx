"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function StockInForm({ parts }: { parts: { id: number; name: string; stock: number }[] }) {
  const router = useRouter();
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partId) {
      setError("Part chunein");
      return;
    }
    setBusy(true);
    setError("");
    setDone("");
    try {
      await api(`/api/parts/${partId}/stock-in`, "POST", { qty: Number(qty), unitCost: Number(unitCost || 0), supplier });
      setDone("✅ Stock add ho gaya");
      setQty("");
      setUnitCost("");
      setSupplier("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stock add nahi ho saka");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-semibold">🚚 Stock In (Purchase)</h2>
      <select value={partId} onChange={(e) => setPartId(e.target.value)} required className="input">
        <option value="" disabled>Choose part…</option>
        {parts.map((p) => (
          <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min={1} required placeholder="Qty" className="input" />
        <input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} type="number" min={0} required placeholder="Rate Rs" className="input" />
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier" className="input" />
      </div>
      {error && <p className="text-sm font-medium text-rose-600">⚠️ {error}</p>}
      {done && <p className="text-sm font-medium text-emerald-600">{done}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Adding..." : "+ Add Stock"}
      </button>
    </form>
  );
}
