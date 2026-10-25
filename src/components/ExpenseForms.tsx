"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { api } from "@/lib/api";

export function ExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/expenses", "POST", { category, amount: Number(amount), note });
      setAmount("");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Expenses could not be saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-2">
      <h2 className="font-semibold">+ Add Expense</h2>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} required className="input" placeholder="Amount Rs" />
      <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Note (optional)" />
      {error && <p className="text-sm text-rose-600">⚠️ {error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
