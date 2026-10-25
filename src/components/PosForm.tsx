"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_MODES } from "@/lib/constants";

type P = { id: number; name: string; model: string; category: string; salePrice: number; costPrice: number; stock: number };
type Item = { key: string; partId: number | null; name: string; qty: number; price: number; cost: number; max?: number };

const rs = (n: number) => "Rs " + Math.round(n).toLocaleString("en-PK");

export function PosForm({ products, customers }: { products: P[]; customers: { name: string; phone: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState<number | null>(null);
  const [mode, setMode] = useState("cash");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState({ name: "", price: "", cost: "" });

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return products.filter((p) => !s || `${p.name} ${p.model} ${p.category}`.toLowerCase().includes(s)).slice(0, 30);
  }, [q, products]);

  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const total = Math.max(0, subtotal - discount);
  const paidAmt = paid === null ? total : paid;
  const due = total - paidAmt;

  function add(p: P) {
    setItems((prev) => {
      const ex = prev.find((i) => i.partId === p.id);
      if (ex) {
        const nextQty = ex.max !== undefined ? Math.min(ex.max, ex.qty + 1) : ex.qty + 1;
        return prev.map((i) => (i.partId === p.id ? { ...i, qty: nextQty } : i));
      }
      return [...prev, { key: "p" + p.id, partId: p.id, name: p.name, qty: 1, price: p.salePrice, cost: p.costPrice, max: p.stock }];
    });
  }

  function addCustom() {
    if (!custom.name.trim() || !custom.price) return;
    setItems((prev) => [
      ...prev,
      {
        key: "c" + Date.now(),
        partId: null,
        name: custom.name.trim(),
        qty: 1,
        price: parseInt(custom.price, 10) || 0,
        cost: parseInt(custom.cost, 10) || 0,
      },
    ]);
    setCustom({ name: "", price: "", cost: "" });
  }

  function upd(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)).filter((i) => i.qty > 0));
  }

  function onCustomerName(v: string) {
    setCustomerName(v);
    const m = customers.find((c) => c.name.toLowerCase() === v.toLowerCase());
    if (m && !phone) setPhone(m.phone);
  }

  async function save() {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          customerName,
          phone,
          discount,
          paid: paidAmt,
          paymentMode: mode,
          items: items.map(({ partId, name, qty, price, cost }) => ({ partId, name, qty, price, cost })),
        }),
      });
      const r = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: number; redirectTo?: string; error?: string };
      if (!res.ok || !r.ok) {
        setError(r.error || "Sale could not be saved");
        setSaving(false);
        return;
      }
      router.push(r.redirectTo || `/sales/${r.id}?new=1`);
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="card lg:col-span-3">
        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
            placeholder="🔍 Search part / accessory (e.g. 13 battery, glass)..."
          />
          <Link href="/inventory/new" className="btn-light shrink-0">
            + New Part
          </Link>
        </div>
        <div className="grid max-h-[420px] gap-2 overflow-y-auto sm:grid-cols-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p)}
              disabled={p.stock <= 0}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-40"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.category} · stock {p.stock}
                </div>
              </div>
              <div className="shrink-0 text-sm font-bold text-indigo-600">{rs(p.salePrice)}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
              No part found in stock.{" "}
              <Link href="/inventory/new" className="font-semibold text-indigo-600 underline">
                + Add a part in Stock
              </Link>{" "}
              or add a custom item below.
            </div>
          )}
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-600">Item not in stock (custom)</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Item name" className="input" />
            <input value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} type="number" placeholder="Sale Rs" className="input sm:w-28" />
            <input value={custom.cost} onChange={(e) => setCustom({ ...custom, cost: e.target.value })} type="number" placeholder="Cost Rs" className="input sm:w-24" />
            <button type="button" onClick={addCustom} className="btn-light shrink-0">
              + Add
            </button>
          </div>
        </div>
      </div>

      <div className="card space-y-3 lg:col-span-2">
        <h2 className="font-semibold">🧾 Bill</h2>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Pick items from the left</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <li key={i.key} className="py-2">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium">{i.name}</span>
                  <span className="font-semibold">{rs(i.qty * i.price)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button type="button" onClick={() => upd(i.key, { qty: i.qty - 1 })} className="h-7 w-7 rounded-lg border">
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{i.qty}</span>
                  <button
                    type="button"
                    onClick={() => upd(i.key, { qty: i.max !== undefined ? Math.min(i.max, i.qty + 1) : i.qty + 1 })}
                    className="h-7 w-7 rounded-lg border"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400">×</span>
                  <input
                    type="number"
                    value={i.price}
                    onChange={(e) => upd(i.key, { price: parseInt(e.target.value, 10) || 0 })}
                    className="input w-24 py-1"
                  />
                  <button type="button" onClick={() => upd(i.key, { qty: 0 })} className="ml-auto text-xs text-rose-500">
                    remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Customer Name</span>
            <input value={customerName} onChange={(e) => onCustomerName(e.target.value)} list="pos-cust" className="input" placeholder="Walk-in" />
            <datalist id="pos-cust">
              {customers.map((c, idx) => (
                <option key={idx} value={c.name}>
                  {c.phone}
                </option>
              ))}
            </datalist>
          </label>
          <label>
            <span className="label">Mobile</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" inputMode="tel" />
          </label>
          <label>
            <span className="label">Discount Rs</span>
            <input type="number" value={discount || ""} onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)} className="input" />
          </label>
          <label>
            <span className="label">Received (Paid) Rs</span>
            <input
              type="number"
              value={paid === null ? total : paid}
              onChange={(e) => setPaid(e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0)}
              className="input"
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PAYMENT_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`rounded-lg border px-1 py-1.5 text-xs font-semibold ${
                mode === m.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{rs(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Discount</span>
              <span>−{rs(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{rs(total)}</span>
          </div>
          {due > 0 && (
            <div className="flex justify-between font-semibold text-rose-600">
              <span>Credit Due</span>
              <span>{rs(due)}</span>
            </div>
          )}
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">⚠️ {error}</p>}
        <button type="button" onClick={save} disabled={saving || items.length === 0} className="btn-green w-full py-3 text-base">
          {saving ? "⏳ Saving..." : `✅ Save Sale ${rs(total)}`}
        </button>
      </div>
    </div>
  );
}
