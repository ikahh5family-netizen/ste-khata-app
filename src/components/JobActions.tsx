"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_STATUSES } from "@/lib/constants";
import { rs } from "@/lib/format";
import { api } from "@/lib/api";

type StockPart = { id: number; name: string; costPrice: number; stock: number };
type UsedPart = { id: number; name: string; qty: number; cost: number; partId: number | null };

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaam nahi ho saka");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}

export function StatusButtons({ jobId, status }: { jobId: number; status: string }) {
  const { busy, error, run } = useAction();
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {JOB_STATUSES.filter((s) => s.value !== "delivered").map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={busy}
            onClick={() => run(() => api(`/api/jobs/${jobId}/status`, "POST", { status: s.value }))}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${status === s.value ? "ring-2 ring-indigo-500 ring-offset-1 " + s.color : s.color + " opacity-70 hover:opacity-100"}`}
          >
            {s.label} <span className="font-normal">({s.hi})</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">⚠️ {error}</p>}
    </div>
  );
}

export function DeliverForm({ jobId, total, due }: { jobId: number; total: number; due: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [t, setT] = useState(String(total));
  const [r, setR] = useState(String(Math.max(0, due)));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/jobs/${jobId}/deliver`, "POST", { total: Number(t), receive: Number(r) });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deliver nahi ho saka");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl bg-emerald-50 p-3">
      <div className="mb-2 text-sm font-semibold text-emerald-800">📦 Mark Delivered</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label>
          <span className="label">Final total (Rs)</span>
          <input type="number" value={t} onChange={(e) => setT(e.target.value)} className="input" />
        </label>
        <label>
          <span className="label">Abhi kitna mila (Rs)</span>
          <input type="number" value={r} onChange={(e) => setR(e.target.value)} className="input" />
        </label>
        <button type="submit" disabled={busy} className="btn-green col-span-2 self-end sm:col-span-1">
          {busy ? "Ruko..." : "Delivered ✅"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">⚠️ {error}</p>}
      <p className="mt-2 text-xs text-emerald-700">If partial payment received, the balance goes to customer Ledger (dues).</p>
    </form>
  );
}

export function JobPaymentForm({ jobId, due }: { jobId: number; due: number }) {
  const [amount, setAmount] = useState("");
  const { busy, error, run } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api(`/api/jobs/${jobId}/payments`, "POST", { amount: Number(amount) })).then(() => setAmount(""));
      }}
      className="mt-3"
    >
      <div className="flex gap-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder={`Payment mila (baaki ${rs(due)})`} className="input" />
        <button type="submit" disabled={busy} className="btn-light shrink-0">+ Payment</button>
      </div>
      {error && <p className="mt-1 text-sm text-rose-600">⚠️ {error}</p>}
    </form>
  );
}

export function JobPartsManager({ jobId, used, stock }: { jobId: number; used: UsedPart[]; stock: StockPart[] }) {
  const router = useRouter();
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [customName, setCustomName] = useState("");
  const [customCost, setCustomCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addStockPart(e: React.FormEvent) {
    e.preventDefault();
    if (!partId) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/jobs/${jobId}/job-parts`, "POST", { partId: Number(partId), qty: Number(qty) });
      setPartId("");
      setQty("1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Part add nahi ho saka");
    } finally {
      setBusy(false);
    }
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/jobs/${jobId}/job-parts`, "POST", { customName, customCost: Number(customCost) });
      setCustomName("");
      setCustomCost("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Part add nahi ho saka");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setError("");
    try {
      await api(`/api/job-parts/${id}`, "DELETE");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata nahi saka");
    }
  }

  return (
    <div>
      {used.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">Abhi koi part add nahi kiya.</p>
      ) : (
        <ul className="mb-3 divide-y divide-slate-100">
          {used.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {u.name} × {u.qty} {!u.partId && <span className="text-xs text-slate-400">(bahar se)</span>}
              </span>
              <span className="flex items-center gap-2">
                {rs(u.cost * u.qty)}
                <button type="button" onClick={() => remove(u.id)} className="text-xs text-rose-500 hover:underline">remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addStockPart} className="flex flex-col gap-2 sm:flex-row">
        <select value={partId} onChange={(e) => setPartId(e.target.value)} required className="input">
          <option value="" disabled>Choose part from stock…</option>
          {stock.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock <= 0}>
              {p.name} — {rs(p.costPrice)} (stock {p.stock})
            </option>
          ))}
        </select>
        <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min={1} className="input sm:w-20" />
        <button type="submit" disabled={busy} className="btn-light shrink-0">+ Add</button>
      </form>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-indigo-600">Add external part (bought from market)</summary>
        <form onSubmit={addCustom} className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} required placeholder="Part name" className="input" />
          <input value={customCost} onChange={(e) => setCustomCost(e.target.value)} required type="number" placeholder="Cost Rs" className="input sm:w-28" />
          <button type="submit" disabled={busy} className="btn-light shrink-0">+ Add</button>
        </form>
      </details>
      {error && <p className="mt-2 text-sm text-rose-600">⚠️ {error}</p>}
    </div>
  );
}
