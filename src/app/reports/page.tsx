import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui";
import { getStats, getTopRepairs, getTopModels, getTopParts, getExpenseBreakdown, getPaymentModeSplit } from "@/lib/queries";
import { rs, startOfDayPK, startOfMonthPK, daysAgoPK, parseDateInputPK, dateInputPK } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const RANGES = [
  { v: "today", l: "Today" },
  { v: "yesterday", l: "Yesterday" },
  { v: "week", l: "7 Days" },
  { v: "month", l: "This Month" },
  { v: "lastmonth", l: "Last Month" },
  { v: "year", l: "1 Year" },
];

function resolveRange(range: string, from?: string, to?: string) {
  const now = new Date();
  const f = parseDateInputPK(from);
  const t = parseDateInputPK(to, true);
  if (f && t) return { from: f, to: t, label: `${from} → ${to}` };
  switch (range) {
    case "yesterday":
      return { from: daysAgoPK(1), to: new Date(startOfDayPK().getTime() - 1), label: "Yesterday" };
    case "week":
      return { from: daysAgoPK(6), to: now, label: "Last 7 days" };
    case "lastmonth": {
      const thisM = startOfMonthPK();
      const prev = startOfMonthPK(new Date(thisM.getTime() - 86400000));
      return { from: prev, to: new Date(thisM.getTime() - 1), label: "Last month" };
    }
    case "year":
      return { from: daysAgoPK(364), to: now, label: "Last 365 days" };
    case "month":
      return { from: startOfMonthPK(), to: now, label: "This month" };
    default:
      return { from: startOfDayPK(), to: now, label: "Today" };
  }
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const range = sp.range || "month";
  const r = resolveRange(range, sp.from, sp.to);
  const [s, repairs, models, topParts, exp, modes] = await Promise.all([
    getStats(r.from, r.to),
    getTopRepairs(r.from, r.to),
    getTopModels(r.from, r.to),
    getTopParts(r.from, r.to),
    getExpenseBreakdown(r.from, r.to),
    getPaymentModeSplit(r.from, r.to),
  ]);

  return (
    <div>
      <PageHeader title="📊 Reports" subtitle={`${r.label} report`} action={<PrintButton />} />
      <div className="no-print mb-3 flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((x) => (
          <Link key={x.v} href={`/reports?range=${x.v}`} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${range === x.v && !sp.from ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
            {x.l}
          </Link>
        ))}
      </div>
      <form className="no-print mb-5 flex flex-wrap items-end gap-2">
        <label>
          <span className="label">From</span>
          <input type="date" name="from" defaultValue={sp.from ?? dateInputPK(r.from)} className="input" />
        </label>
        <label>
          <span className="label">To</span>
          <input type="date" name="to" defaultValue={sp.to ?? dateInputPK(r.to)} className="input" />
        </label>
        <button className="btn-light">View</button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={rs(s.totalRevenue)} tone="indigo" />
        <StatCard label="Gross Profit" value={rs(s.grossProfit)} tone="violet" sub="After parts cost" />
        <StatCard label="Expenses" value={rs(s.expenses)} tone="rose" />
        <StatCard label="Net Profit" value={rs(s.netProfit)} tone="emerald" sub="After expenses" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">🔧 Repair</h2>
          <Line k="Delivered Jobs" v={String(s.repairCount)} />
          <Line k="Repair Revenue" v={rs(s.repairRevenue)} />
          <Line k="Parts Cost" v={"− " + rs(s.repairPartsCost)} />
          <Line k="Repair Profit" v={rs(s.repairRevenue - s.repairPartsCost)} bold />
          <Line k="Avg per Job" v={rs(s.repairCount ? s.repairRevenue / s.repairCount : 0)} />
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">🧾 Parts Sale</h2>
          <Line k="Bills" v={String(s.saleCount)} />
          <Line k="Sale Amount" v={rs(s.saleRevenue)} />
          <Line k="Purchase Cost" v={"− " + rs(s.saleCost)} />
          <Line k="Sale Profit" v={rs(s.saleRevenue - s.saleCost)} bold />
          <Line k="Stock Purchased" v={rs(s.purchases)} />
          <Line k="Credit Collected" v={rs(s.paymentsReceived)} />
        </div>
        <Table title="🏆 Top Repairs" head={["Repair", "Jobs", "Revenue", "Profit"]} rows={repairs.map((x) => [x.repair_type, x.c, rs(x.t), rs(x.profit)])} />
        <Table title="📱 Top Models (received)" head={["Model", "Jobs", "Value"]} rows={models.map((x) => [x.device_model, x.c, rs(x.t)])} />
        <Table title="🛒 Top Parts Sold" head={["Part", "Qty", "Sale", "Profit"]} rows={topParts.map((x) => [x.name, x.q, rs(x.t), rs(x.profit)])} />
        <Table title="💸 Expenses" head={["Category", "Amount"]} rows={exp.map((x) => [x.category, rs(x.t)])} />
        <Table title="💳 Payment Mode (parts sale)" head={["Mode", "Amount"]} rows={modes.map((x) => [x.payment_mode.toUpperCase(), rs(x.t)])} />
      </div>
    </div>
  );
}

function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-slate-50 py-1.5 text-sm ${bold ? "font-bold text-emerald-700" : ""}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="card">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              {head.map((h, i) => (
                <th key={h} className={`py-1 ${i ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-50">
                {r.map((c, j) => (
                  <td key={j} className={`py-1.5 ${j ? "text-right" : ""}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
