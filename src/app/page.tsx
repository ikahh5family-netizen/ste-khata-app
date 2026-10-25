import Link from "next/link";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { parts, repairJobs } from "@/db/schema";
import { desc, inArray, sql } from "drizzle-orm";
import { PageHeader, StatCard, StatusBadge, AppleLogo } from "@/components/ui";
import { ApiActionButton } from "@/components/ApiForm";
import { BackupRestoreCard } from "@/components/BackupRestore";
import { getStats, getTotalUdhaar, getJobStatusCounts, getLowStock, getLast7Days } from "@/lib/queries";
import { rs, startOfDayPK, startOfMonthPK, jobNo, fmtDate } from "@/lib/format";
import { getQuickInsights } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await ensureSchema();
  const now = new Date();
  const [today, month, udhaar, counts, low, week, partCount, activeJobs, insights] = await Promise.all([
    getStats(startOfDayPK(), now),
    getStats(startOfMonthPK(), now),
    getTotalUdhaar(),
    getJobStatusCounts(),
    getLowStock(),
    getLast7Days(),
    db.select({ c: sql<number>`count(*)::int` }).from(parts),
    db
      .select()
      .from(repairJobs)
      .where(inArray(repairJobs.status, ["received", "in_progress", "waiting_part", "ready"]))
      .orderBy(desc(repairJobs.receivedAt))
      .limit(8),
    getQuickInsights(),
  ]);

  const isEmpty = (partCount[0]?.c ?? 0) === 0 && activeJobs.length === 0;
  const pending = (counts.received ?? 0) + (counts.in_progress ?? 0) + (counts.waiting_part ?? 0);
  const maxDay = Math.max(1, ...week.map((d) => d.repair + d.sale));

  return (
    <div>
      <PageHeader
        title="Welcome 👋"
        subtitle={now.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Karachi" })}
        action={
          <>
            <Link href="/jobs/new" className="btn-primary">
              + Repair Job
            </Link>
            <Link href="/sales/new" className="btn-green">
              + Parts Sale
            </Link>
            <Link href="/inventory/new" className="btn-light">
              + Stock Part
            </Link>
          </>
        }
      />

      <BackupRestoreCard />

      {isEmpty && (
        <div className="card mb-5 flex flex-col items-start gap-3 border-orange-200 bg-orange-50 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/ste-logo.png" alt="STE Logo" className="h-12 w-12 shrink-0 rounded-xl shadow" />
            <div>
              <div className="font-semibold text-orange-900">STE Mobile Care — How to get started?</div>
              <div className="text-sm text-orange-800">Add your stock or a new repair job, or load demo data to try the app.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/inventory/new" className="btn-light">
              + Add Stock
            </Link>
            <Link href="/jobs/new" className="btn-light">
              + Add Job
            </Link>
            <ApiActionButton endpoint="/api/seed" payload={{}} loadingText="Loading..." className="btn-primary">
              Load Demo Data
            </ApiActionButton>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={rs(today.totalRevenue)}
          sub={`${today.repairCount} repairs · ${today.saleCount} sales`}
          tone="indigo"
          href="/reports?range=today"
        />
        <StatCard label="Today's Profit" value={rs(today.netProfit)} sub={`Expenses ${rs(today.expenses)}`} tone="emerald" href="/reports?range=today" />
        <StatCard label="This Month's Revenue" value={rs(month.totalRevenue)} sub={`Profit ${rs(month.netProfit)}`} tone="violet" href="/reports?range=month" />
        <StatCard label="Credit Due" value={rs(udhaar)} sub="To be collected from customers" tone="rose" href="/khata" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { k: "received", l: "Received", c: "text-sky-600" },
          { k: "in_progress", l: "In Progress", c: "text-amber-600" },
          { k: "waiting_part", l: "Waiting Part", c: "text-purple-600" },
          { k: "ready", l: "Ready", c: "text-emerald-600" },
          { k: "delivered", l: "Delivered", c: "text-slate-700" },
          { k: "cancelled", l: "Cancelled", c: "text-rose-600" },
        ].map((s) => (
          <Link key={s.k} href={`/jobs?status=${s.k}`} className="card py-3 text-center transition hover:-translate-y-0.5">
            <div className={`text-xl font-bold ${s.c}`}>{counts[s.k] ?? 0}</div>
            <div className="text-[11px] text-slate-500">{s.l}</div>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Last 7 Days</h2>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <i className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                Repair
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                Parts
              </span>
            </div>
          </div>
          <div className="flex h-44 items-end gap-2">
            {week.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-[10px] text-slate-500">{d.repair + d.sale ? rs(d.repair + d.sale).replace("Rs ", "") : ""}</div>
                <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-lg bg-slate-100" style={{ height: "130px" }}>
                  <div className="bg-indigo-500" style={{ height: `${(d.repair / maxDay) * 100}%` }} />
                  <div className="bg-emerald-400" style={{ height: `${(d.sale / maxDay) * 100}%` }} />
                </div>
                <div className="text-[11px] text-slate-500">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">✨ AI Insights</h2>
            <Link href="/ai" className="rounded-full bg-white/20 px-2.5 py-1 text-xs">
              Chat →
            </Link>
          </div>
          <ul className="space-y-2 text-sm text-indigo-50">
            {insights.map((t, i) => (
              <li key={i} className="rounded-xl bg-white/10 px-3 py-2">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Active Repair Jobs ({pending + (counts.ready ?? 0)})</h2>
            <Link href="/jobs" className="text-sm font-medium text-indigo-600">
              View all →
            </Link>
          </div>
          {activeJobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No pending jobs 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeJobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      <AppleLogo className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
                      {j.deviceModel} · <span className="text-slate-600">{j.repairType}</span>
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {jobNo(j.id)} · {j.customerName} · {fmtDate(j.receivedAt)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={j.status} />
                    <div className="mt-0.5 text-xs font-semibold">{rs(j.total)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">⚠️ Low Stock</h2>
            <Link href="/inventory?low=1" className="text-sm font-medium text-indigo-600">
              Stock →
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">All stock is fine ✅</p>
          ) : (
            <ul className="space-y-2">
              {low.slice(0, 7).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{p.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.stock <= 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
