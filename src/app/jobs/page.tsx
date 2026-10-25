import Link from "next/link";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs } from "@/db/schema";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { PageHeader, StatusBadge, Empty } from "@/components/ui";
import { JOB_STATUSES } from "@/lib/constants";
import { rs, fmtDate, jobNo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await ensureSchema();
  const { q = "", status = "" } = await searchParams;
  const conds: SQL[] = [];
  if (status === "active") {
    conds.push(or(eq(repairJobs.status, "received"), eq(repairJobs.status, "in_progress"), eq(repairJobs.status, "waiting_part"), eq(repairJobs.status, "ready"))!);
  } else if (status) conds.push(eq(repairJobs.status, status));
  if (q) {
    const like = `%${q}%`;
    const idNum = parseInt(q.replace(/\D/g, ""), 10);
    const ors: SQL[] = [
      ilike(repairJobs.customerName, like),
      ilike(repairJobs.phone, like),
      ilike(repairJobs.deviceModel, like),
      ilike(repairJobs.imei, like),
      ilike(repairJobs.repairType, like),
    ];
    if (Number.isFinite(idNum) && idNum < 1e8) ors.push(eq(repairJobs.id, idNum));
    conds.push(or(...ors)!);
  }
  const list = await db
    .select()
    .from(repairJobs)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(repairJobs.receivedAt))
    .limit(200);

  const tabs = [{ value: "", label: "All" }, { value: "active", label: "Active" }, ...JOB_STATUSES.map((s) => ({ value: s.value, label: s.label }))];

  return (
    <div>
      <PageHeader
        title="🔧 Repair Jobs"
        subtitle="Record of every phone — received, in progress, ready, delivered"
        action={
          <Link href="/jobs/new" className="btn-primary">
            + New Job
          </Link>
        }
      />

      <form className="mb-3 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} className="input" placeholder="Search name, phone, model, IMEI or job no..." />
        <button className="btn-light">Search</button>
      </form>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/jobs?status=${t.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${status === t.value ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty
          text="No job found."
          action={
            <Link href="/jobs/new" className="btn-primary">
              + New Job
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((j) => {
            const due = j.total - j.paid;
            return (
              <Link key={j.id} href={`/jobs/${j.id}`} className="card block transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-indigo-600">{jobNo(j.id)}</div>
                    <div className="truncate font-semibold">{j.deviceModel}</div>
                    <div className="truncate text-sm text-slate-600">{j.repairType}</div>
                  </div>
                  <StatusBadge status={j.status} />
                </div>
                <div className="mt-3 flex items-end justify-between text-sm">
                  <div className="min-w-0 text-slate-500">
                    <div className="truncate">👤 {j.customerName} {j.phone && `· ${j.phone}`}</div>
                    <div className="text-xs">{fmtDate(j.receivedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{rs(j.total)}</div>
                    {due > 0 && j.status !== "cancelled" && <div className="text-xs font-semibold text-rose-600">Due {rs(due)}</div>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
