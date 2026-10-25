import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs, jobParts, parts } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { StatusBadge } from "@/components/ui";
import { ApiForm, ApiActionButton, ConfirmDeleteButton } from "@/components/ApiForm";
import { JOB_STATUSES, SHOP_NAME } from "@/lib/constants";
import { rs, fmtDateTime, fmtDate, jobNo, waLink } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function JobDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  await ensureSchema();
  const { id: idStr } = await params;
  const { new: isNew } = await searchParams;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) notFound();
  const used = await db.select().from(jobParts).where(eq(jobParts.jobId, id));
  const stock = await db.select().from(parts).orderBy(asc(parts.name));

  const due = job.total - job.paid;
  const profit = job.total - job.partsCost;
  const warrantyTill = job.deliveredAt && job.warrantyDays ? new Date(job.deliveredAt.getTime() + job.warrantyDays * 86400000) : null;

  const msgReady = `Hello ${job.customerName} 🙏\nYour ${job.deviceModel} (${job.repairType}) repair is done and ready ✅\nJob No: ${jobNo(job.id)}\nTotal: ${rs(job.total)}${due > 0 ? `\nDue: ${rs(due)}` : ""}\nPlease collect it from the shop.\n- ${SHOP_NAME}`;
  const msgReceived = `Hello ${job.customerName} 🙏\nWe have received your ${job.deviceModel} for repair.\nJob No: ${jobNo(job.id)}\nProblem: ${job.repairType}\nEstimate: ${rs(job.total)}${job.paid ? `\nAdvance: ${rs(job.paid)}` : ""}\nWe will message you when it is ready.\n- ${SHOP_NAME}`;
  const msgDelivered = `Thank you ${job.customerName} 🙏\nYour ${job.deviceModel} (${job.repairType}) has been delivered.\nPaid: ${rs(job.paid)}${due > 0 ? `\nDue: ${rs(due)}` : ""}${warrantyTill ? `\nWarranty: till ${fmtDate(warrantyTill)}` : ""}\n- ${SHOP_NAME}`;
  const msg = job.status === "ready" ? msgReady : job.status === "delivered" ? msgDelivered : msgReceived;

  return (
    <div className="mx-auto max-w-4xl">
      {isNew && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✅ Job saved! WhatsApp the receipt to the customer or print it.
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jobs" className="text-sm text-slate-500">
            ← Jobs
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold">{job.deviceModel}</h1>
            <StatusBadge status={job.status} />
          </div>
          <div className="text-sm text-slate-500">
            {jobNo(job.id)} · {job.repairType} · {fmtDateTime(job.receivedAt)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.phone && (
            <a href={waLink(job.phone, msg)} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:opacity-90">
              WhatsApp
            </a>
          )}
          <Link href={`/jobs/${job.id}/print`} className="btn-light">
            🖨️ Print
          </Link>
          <Link href={`/jobs/${job.id}/edit`} className="btn-light">
            ✏️ Edit
          </Link>
          <Link href="/jobs/new" className="btn-primary">
            + New Job
          </Link>
        </div>
      </div>

      <div className="card mb-4">
        <div className="mb-2 text-xs font-semibold text-slate-500">CHANGE STATUS</div>
        <div className="flex flex-wrap gap-2">
          {JOB_STATUSES.filter((s) => s.value !== "delivered").map((s) => (
            <ApiActionButton
              key={s.value}
              endpoint="/api/jobs"
              payload={{ action: "status", id: job.id, status: s.value }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                job.status === s.value ? "ring-2 ring-indigo-500 ring-offset-1 " + s.color : s.color + " opacity-70 hover:opacity-100"
              }`}
            >
              {s.label}
            </ApiActionButton>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="card">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-lg font-bold">{rs(job.total)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Paid</div>
                <div className="text-lg font-bold text-emerald-600">{rs(job.paid)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Due</div>
                <div className={`text-lg font-bold ${due > 0 ? "text-rose-600" : "text-slate-400"}`}>{rs(Math.max(0, due))}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Profit</div>
                <div className="text-lg font-bold text-indigo-600">{rs(profit)}</div>
                <div className="text-[11px] text-slate-400">Parts {rs(job.partsCost)}</div>
              </div>
            </div>

            {job.status !== "delivered" && job.status !== "cancelled" && (
              <ApiForm endpoint="/api/jobs" actionName="deliver" className="mt-4 rounded-xl bg-emerald-50 p-3">
                <input type="hidden" name="id" value={job.id} />
                <div className="mb-2 text-sm font-semibold text-emerald-800">📦 Mark Delivered</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label>
                    <span className="label">Final Total (Rs)</span>
                    <input name="total" type="number" defaultValue={job.total} className="input" />
                  </label>
                  <label>
                    <span className="label">Received Now (Rs)</span>
                    <input name="receive" type="number" defaultValue={Math.max(0, due)} className="input" />
                  </label>
                  <button type="submit" className="btn-green col-span-2 self-end sm:col-span-1">
                    Delivered ✅
                  </button>
                </div>
                <p className="mt-2 text-xs text-emerald-700">If less is paid, the remaining amount is added to the customer&apos;s Khata (credit).</p>
              </ApiForm>
            )}

            {(job.status === "delivered" || job.status === "ready") && due > 0 && (
              <ApiForm endpoint="/api/jobs" actionName="payment" resetOnSuccess className="mt-3">
                <div className="flex gap-2">
                  <input type="hidden" name="id" value={job.id} />
                  <input name="amount" type="number" min={1} required placeholder={`Payment received (due ${rs(due)})`} className="input" />
                  <button type="submit" className="btn-light shrink-0">
                    + Payment
                  </button>
                </div>
              </ApiForm>
            )}
            {job.status === "delivered" && (
              <div className="mt-3 text-sm text-slate-600">
                Delivered: {fmtDateTime(job.deliveredAt)}
                {warrantyTill && (
                  <>
                    {" "}
                    · Warranty <b>{fmtDate(warrantyTill)}</b> till {warrantyTill < new Date() ? "(expired)" : "✅"}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">🔩 Parts Used (cost)</h2>
            {used.length === 0 ? (
              <p className="mb-3 text-sm text-slate-500">No parts added yet.</p>
            ) : (
              <ul className="mb-3 divide-y divide-slate-100">
                {used.map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {u.name} × {u.qty} {!u.partId && <span className="text-xs text-slate-400">(outside)</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      {rs(u.cost * u.qty)}
                      <ApiActionButton endpoint="/api/jobs" payload={{ action: "removePart", id: u.id }} className="text-xs text-rose-500 hover:underline">
                        remove
                      </ApiActionButton>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {stock.length > 0 ? (
              <ApiForm endpoint="/api/jobs" actionName="addPart" resetOnSuccess>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="jobId" value={job.id} />
                  <select name="partId" className="input" required defaultValue="">
                    <option value="" disabled>
                      Select part from stock…
                    </option>
                    {stock.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} — {rs(p.costPrice)} (stock {p.stock})
                      </option>
                    ))}
                  </select>
                  <input name="qty" type="number" min={1} defaultValue={1} className="input sm:w-20" />
                  <button type="submit" className="btn-light shrink-0">
                    + Add
                  </button>
                </div>
              </ApiForm>
            ) : (
              <p className="text-xs text-slate-500">
                Stock is empty —{" "}
                <Link href="/inventory/new" className="font-semibold text-indigo-600 underline">
                  add a part in Stock
                </Link>{" "}
                or enter an outside part below.
              </p>
            )}

            <details className="mt-3" open={stock.length === 0}>
              <summary className="cursor-pointer text-xs font-medium text-indigo-600">Add a part bought outside (market)</summary>
              <ApiForm endpoint="/api/jobs" actionName="addPart" resetOnSuccess className="mt-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="jobId" value={job.id} />
                  <input name="customName" required placeholder="Part name (e.g. 13 Pro Display)" className="input" />
                  <input name="customCost" required type="number" min={0} placeholder="Cost Rs" className="input sm:w-28" />
                  <input type="hidden" name="qty" value={1} />
                  <button type="submit" className="btn-light shrink-0">
                    + Add
                  </button>
                </div>
              </ApiForm>
            </details>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="card space-y-2 text-sm">
            <h2 className="font-semibold">👤 Customer</h2>
            <div className="font-medium">{job.customerName}</div>
            {job.phone && (
              <a href={`tel:${job.phone}`} className="block text-indigo-600">
                📞 {job.phone}
              </a>
            )}
            {job.customerId && (
              <Link href={`/khata/${job.customerId}`} className="block text-xs text-slate-500 hover:underline">
                View Khata →
              </Link>
            )}
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="font-semibold">📋 Details</h2>
            <Row k="IMEI" v={job.imei} />
            <Row k="Passcode" v={job.passcode} />
            <Row k="Technician" v={job.technician} />
            <Row k="Warranty" v={job.warrantyDays ? `${job.warrantyDays} days` : ""} />
            <Row k="Problem" v={job.issue} />
            <Row k="Notes" v={job.notes} />
          </div>
          <ConfirmDeleteButton
            endpoint="/api/jobs"
            payload={{ action: "delete", id: job.id }}
            confirmText="Delete this job? Used parts will return to stock."
          >
            🗑️ Delete Job
          </ConfirmDeleteButton>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium">{v || "-"}</span>
    </div>
  );
}
