import Link from "next/link";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { sales } from "@/db/schema";
import { desc, ilike, or } from "drizzle-orm";
import { PageHeader, Empty } from "@/components/ui";
import { rs, fmtDateTime, invNo, startOfDayPK } from "@/lib/format";
import { getStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await ensureSchema();
  const { q = "" } = await searchParams;
  const list = await db
    .select()
    .from(sales)
    .where(q ? or(ilike(sales.customerName, `%${q}%`), ilike(sales.phone, `%${q}%`)) : undefined)
    .orderBy(desc(sales.createdAt))
    .limit(200);
  const today = await getStats(startOfDayPK(), new Date());

  return (
    <div>
      <PageHeader
        title="🧾 Parts Sale"
        subtitle={`Today: ${today.saleCount} bills · ${rs(today.saleRevenue)} · profit ${rs(today.saleRevenue - today.saleCost)}`}
        action={
          <Link href="/sales/new" className="btn-green">
            + New Sale
          </Link>
        }
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Customer name / phone..." />
        <button className="btn-light">Search</button>
      </form>
      {list.length === 0 ? (
        <Empty
          text="No sales yet."
          action={
            <Link href="/sales/new" className="btn-green">
              + New Sale
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {list.map((s) => {
            const due = s.total - s.paid;
            return (
              <Link key={s.id} href={`/sales/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {invNo(s.id)} · {s.customerName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {fmtDateTime(s.createdAt)} · {s.paymentMode.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{rs(s.total)}</div>
                  {due > 0 ? (
                    <div className="text-xs font-semibold text-rose-600">Credit {rs(due)}</div>
                  ) : (
                    <div className="text-xs text-emerald-600">Profit {rs(s.total - s.cost)}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
