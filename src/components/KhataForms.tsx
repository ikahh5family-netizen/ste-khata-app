"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/constants";
import { api } from "@/lib/api";

export function CustomerQuickAdd() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ ok: boolean; id: number }>("/api/customers", "POST", { name, phone });
      router.push(`/khata/${r.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save nahi ho saka");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Naam" className="input" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile" className="input" />
      {error && <p className="text-sm text-rose-600">⚠️ {error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Adding..." : "Add"}
      </button>
    </form>
  );
}

export function KhataPaymentForm({ customerId, defaultAmount }: { customerId: number; defaultAmount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const [mode, setMode] = useState("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/customers/${customerId}/payments`, "POST", { amount: Number(amount), mode, note });
      setAmount("");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save Payment nahi ho saka");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-2">
      <h2 className="font-semibold">💵 Payment Received</h2>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} required className="input" placeholder="Amount Rs" />
      <select value={mode} onChange={(e) => setMode(e.target.value)} className="input">
        {PAYMENT_MODES.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Note (optional)" />
      {error && <p className="text-sm text-rose-600">⚠️ {error}</p>}
      <button type="submit" disabled={busy} className="btn-green w-full">
        {busy ? "Saving..." : "Save Payment"}
      </button>
    </form>
  );
}

export function CustomerEditForm({ id, name, phone, notes }: { id: number; name: string; phone: string; notes: string }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [nt, setNt] = useState(notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone("");
    try {
      await api(`/api/customers/${id}`, "PUT", { name: n, phone: p, notes: nt });
      setDone("✅ Save ho gaya");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save nahi ho saka");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-2">
      <h2 className="font-semibold">✏️ Customer Details</h2>
      <input value={n} onChange={(e) => setN(e.target.value)} className="input" />
      <input value={p} onChange={(e) => setP(e.target.value)} className="input" placeholder="Mobile" />
      <input value={nt} onChange={(e) => setNt(e.target.value)} className="input" placeholder="Notes" />
      {error && <p className="text-sm text-rose-600">⚠️ {error}</p>}
      {done && <p className="text-sm text-emerald-600">{done}</p>}
      <button type="submit" disabled={busy} className="btn-light w-full">
        {busy ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
