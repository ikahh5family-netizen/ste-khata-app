import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { expenses } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PageHeader, StatCard, Empty } from "@/components/ui";
import { ApiForm, ApiActionButton } from "@/components/ApiForm";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { rs, fmtDateTime, startOfDayPK, startOfMonthPK } from "@/lib/format";
import { getExpenseBreakdown, getStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await ensureSchema();
  const now = new Date();
  const [list, today, month, breakdown] = await Promise.all([
    db.select().from(expenses).orderBy(desc(expenses.createdAt)).limit(100),
    getStats(startOfDayPK(), now),
    getStats(startOfMonthPK(), now),
    getExpenseBreakdown(startOfMonthPK(), now),
  ]);
  const max = Math.max(1, ...breakdown.map((b) => b.t));

  return (
    <div>
      <PageHeader title="💸 Expenses" subtitle="Rent, salary, electricity, tea — record everything to know your real profit" />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Today's Expenses" value={rs(today.expenses)} tone="rose" />
        <StatCard label="This Month" value={rs(month.expenses)} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <ApiForm endpoint="/api/expenses" actionName="add" resetOnSuccess className="card space-y-2">
            <h2 className="font-semibold">+ Add Expense</h2>
            <select name="category" className="input">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input name="amount" type="number" min={1} required className="input" placeholder="Amount Rs" />
            <input name="note" className="input" placeholder="Note (optional)" />
            <button type="submit" className="btn-primary w-full">
              ✅ Save Expense
            </button>
          </ApiForm>

          <div className="card">
            <h2 className="mb-3 font-semibold">This Month – by Category</h2>
            {breakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses.</p>
            ) : (
              <div className="space-y-2">
                {breakdown.map((b) => (
                  <div key={b.category}>
                    <div className="flex justify-between text-xs">
                      <span>{b.category}</span>
                      <span className="font-semibold">{rs(b.t)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-rose-400" style={{ width: `${(b.t / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {list.length === 0 ? (
            <Empty text="No expense records yet." />
          ) : (
            <div className="card divide-y divide-slate-100 p-0">
              {list.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{e.category}</div>
                    <div className="text-xs text-slate-500">
                      {fmtDateTime(e.createdAt)} {e.note && `· ${e.note}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-rose-600">{rs(e.amount)}</span>
                    <ApiActionButton endpoint="/api/expenses" payload={{ action: "delete", id: e.id }} className="text-xs text-slate-400 hover:text-rose-500">
                      ✕
                    </ApiActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
