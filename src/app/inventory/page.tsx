import Link from "next/link";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { parts, purchases } from "@/db/schema";
import { and, asc, desc, ilike, lte, or, type SQL } from "drizzle-orm";
import { PageHeader, Empty, StatCard } from "@/components/ui";
import { ApiForm } from "@/components/ApiForm";
import { PART_CATEGORIES, IPHONE_MODELS } from "@/lib/constants";
import { rs, fmtDate } from "@/lib/format";
import { getInventoryValue } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  await ensureSchema();
  const { q = "", low } = await searchParams;
  const conds: SQL[] = [];
  if (q) conds.push(or(ilike(parts.name, `%${q}%`), ilike(parts.model, `%${q}%`), ilike(parts.category, `%${q}%`))!);
  if (low) conds.push(lte(parts.stock, parts.minStock));
  const [list, inv, recent] = await Promise.all([
    db.select().from(parts).where(conds.length ? and(...conds) : undefined).orderBy(asc(parts.category), asc(parts.name)),
    getInventoryValue(),
    db.select().from(purchases).orderBy(desc(purchases.createdAt)).limit(10),
  ]);
  const allParts = low || q ? await db.select().from(parts).orderBy(asc(parts.name)) : list;

  return (
    <div>
      <PageHeader
        title="📦 Stock / Parts"
        subtitle="Displays, batteries, flexes, accessories — all your stock"
        action={
          <Link href="/inventory/new" className="btn-primary">
            + New Part
          </Link>
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Items" value={String(inv.items)} />
        <StatCard label="Stock Value (cost)" value={rs(inv.cost)} tone="amber" />
        <StatCard label="Selling Value" value={rs(inv.sale)} tone="emerald" />
      </div>

      <details className="card mb-4" open={allParts.length === 0}>
        <summary className="cursor-pointer font-semibold text-indigo-700">➕ Quick Add New Part / Stock Item</summary>
        <ApiForm endpoint="/api/parts" actionName="save" resetOnSuccess className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <input name="name" required placeholder="Part name * (e.g. iPhone 13 Display)" className="input sm:col-span-2" />
            <input name="category" list="inv-cat-list" defaultValue="Display" placeholder="Category" className="input" />
            <datalist id="inv-cat-list">
              {PART_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input name="model" list="inv-model-list" placeholder="Model (e.g. iPhone 13 / All)" className="input" />
            <datalist id="inv-model-list">
              {["All", ...IPHONE_MODELS].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <input name="costPrice" type="number" min={0} placeholder="Cost Price Rs" className="input" />
            <input name="salePrice" type="number" min={0} placeholder="Sale Price Rs" className="input" />
            <input name="stock" type="number" defaultValue={1} placeholder="Stock Qty" className="input" />
            <input name="minStock" type="number" min={0} defaultValue={2} placeholder="Min Alert" className="input" />
            <button type="submit" className="btn-primary">
              ✅ Save to Stock
            </button>
          </div>
        </ApiForm>
      </details>

      <form className="mb-3 flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Part, model, category..." />
        <button className="btn-light">Search</button>
        <Link href={low ? "/inventory" : "/inventory?low=1"} className={`btn shrink-0 ${low ? "bg-amber-500 text-white" : "border border-slate-200 bg-white"}`}>
          ⚠️ Low Stock
        </Link>
      </form>

      {list.length === 0 ? (
        <Empty
          text="No part found yet — use the form above or the '+ New Part' button."
          action={
            <Link href="/inventory/new" className="btn-primary">
              + Add Part
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">Part</th>
                <th className="px-2">Category</th>
                <th className="px-2 text-right">Cost</th>
                <th className="px-2 text-right">Sale</th>
                <th className="px-2 text-right">Margin</th>
                <th className="px-4 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/inventory/${p.id}`} className="font-medium hover:text-indigo-600">
                      {p.name}
                    </Link>
                    {p.model && <div className="text-xs text-slate-500">{p.model}</div>}
                  </td>
                  <td className="px-2 text-slate-600">{p.category}</td>
                  <td className="px-2 text-right">{rs(p.costPrice)}</td>
                  <td className="px-2 text-right font-semibold">{rs(p.salePrice)}</td>
                  <td className="px-2 text-right text-emerald-600">{rs(p.salePrice - p.costPrice)}</td>
                  <td className="px-4 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        p.stock <= 0 ? "bg-rose-100 text-rose-700" : p.stock <= p.minStock ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-semibold">🚚 Stock In (new purchase of an existing part)</h2>
          {allParts.length === 0 ? (
            <p className="text-sm text-slate-500">
              First create your first item in <b>Quick Add New Part</b> above, then you can add its incoming purchase (Stock In) here.
            </p>
          ) : (
            <ApiForm endpoint="/api/parts" actionName="stockIn" resetOnSuccess className="space-y-3">
              <select name="partId" required className="input" defaultValue="">
                <option value="" disabled>
                  Select part…
                </option>
                {allParts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (stock {p.stock})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input name="qty" type="number" min={1} required placeholder="Qty" className="input" />
                <input name="unitCost" type="number" min={0} required placeholder="Rate Rs" className="input" />
                <input name="supplier" placeholder="Supplier" className="input" />
              </div>
              <button type="submit" className="btn-primary w-full">
                + Add Stock
              </button>
            </ApiForm>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Recent Purchases</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No purchase records.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between py-2">
                  <span>
                    {r.partName} × {r.qty}
                    <span className="block text-xs text-slate-500">
                      {fmtDate(r.createdAt)} {r.supplier && `· ${r.supplier}`}
                    </span>
                  </span>
                  <span className="font-semibold">{rs(r.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
