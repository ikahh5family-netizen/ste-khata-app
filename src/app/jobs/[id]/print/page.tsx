import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs, jobParts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHOP_NAME, SHOP_FULL_NAME, SHOP_LOGO } from "@/lib/constants";
import { statusInfo } from "@/lib/constants";
import { rs, fmtDateTime, fmtDate, jobNo } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { AppleLogo } from "@/components/ui";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-[13px] font-semibold leading-snug text-[#171717]">{value || "—"}</dd>
    </div>
  );
}

export default async function PrintJob({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) notFound();
  const used = await db.select().from(jobParts).where(eq(jobParts.jobId, id));
  const balance = Math.max(0, job.total - job.paid);
  const credit = Math.max(0, job.paid - job.total);
  const warrantyUntil = job.deliveredAt && job.warrantyDays > 0 ? new Date(job.deliveredAt.getTime() + job.warrantyDays * 86400000) : null;
  const status = statusInfo(job.status);

  return (
    <div className="mx-auto max-w-[700px]">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/jobs/${id}`} className="text-sm font-semibold text-orange-700 hover:underline">← Back to job</Link>
          <p className="mt-1 text-xs text-slate-500">Customer copy · A5 black-and-white / low-ink print layout · Passcode and internal costs are not printed</p>
        </div>
        <PrintButton label="🖨️ Print / Save PDF" />
      </div>

      <article className="repair-ticket overflow-hidden rounded-[26px] border border-slate-200 bg-white text-[#171717] shadow-xl shadow-slate-200/70">
        <div className="ticket-brand relative overflow-hidden border-t-[6px] border-orange-500 bg-[#111111] px-5 py-6 text-white sm:px-8">
          <div className="ticket-ornament pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full border-[28px] border-orange-500/10" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="ticket-mark shrink-0 rounded-xl border border-orange-400/70 bg-orange-500 p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SHOP_LOGO} alt="STE logo" className="ticket-mark-image h-14 w-14 rounded-[10px] object-cover sm:h-16 sm:w-16" />
                <span className="ticket-mark-monochrome hidden h-14 w-14 items-center justify-center text-xl font-black tracking-tight" aria-hidden="true">STE</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-orange-300">{SHOP_FULL_NAME} · Since 2003</p>
                <h1 className="mt-0.5 truncate text-lg font-black tracking-tight text-white sm:text-2xl">{SHOP_NAME}</h1>
                <p className="mt-0.5 text-[10px] text-slate-300">iPhone repair · Genuine care · Parts &amp; accessories</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <AppleLogo className="ml-auto h-6 w-6 text-orange-400" />
              <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-orange-300">Customer<br />copy</div>
            </div>
          </div>
        </div>

        <div className="ticket-section ticket-job-band flex flex-wrap items-center justify-between gap-3 border-b border-orange-200 bg-orange-50 px-5 py-4 sm:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">{job.status === "delivered" ? "Repair invoice" : "Repair receipt · Job card"}</p>
            <div className="mt-1 text-2xl font-black tracking-tight text-[#171717]">{jobNo(job.id)}</div>
          </div>
          <div className="text-right">
            <span className="ticket-status inline-flex rounded-full border border-orange-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-800">{status.label}</span>
            <p className="mt-1 text-[11px] text-slate-600">Received {fmtDateTime(job.receivedAt)}</p>
            {job.deliveredAt && <p className="text-[11px] text-slate-600">Delivered {fmtDateTime(job.deliveredAt)}</p>}
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-8">
          <section className="ticket-section">
            <h2 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Customer information
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <Detail label="Customer" value={job.customerName} />
              <Detail label="Contact number" value={job.phone} />
            </dl>
          </section>

          <section className="ticket-section">
            <h2 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Device &amp; repair
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 p-4">
              <Detail label="Device model" value={job.deviceModel} />
              <Detail label="Service requested" value={job.repairType} />
              <Detail label="IMEI / Serial" value={job.imei} />
              <Detail label="Technician" value={job.technician} />
              {job.issue && <div className="col-span-2"><Detail label="Reported issue" value={job.issue} /></div>}
              {job.notes && <div className="col-span-2"><Detail label="Received condition / notes" value={job.notes} /></div>}
            </dl>
          </section>

          {used.length > 0 && (
            <section className="ticket-section">
              <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700">Parts fitted</h2>
              <ul className="overflow-hidden rounded-xl border border-slate-200 text-[12px]">
                {used.map((part) => (
                  <li key={part.id} className="flex justify-between gap-3 border-b border-slate-100 px-4 py-2 last:border-b-0">
                    <span className="min-w-0 break-words">{part.name}</span>
                    <span className="shrink-0 font-bold">× {part.qty}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="ticket-section ticket-payment overflow-hidden rounded-xl border border-slate-200">
            <div className="ticket-payment-heading flex items-center justify-between gap-3 bg-[#171717] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              <span>Payment summary</span>
              <span className="text-orange-300">PKR</span>
            </div>
            <dl className="space-y-2 px-4 py-3 text-[12px]">
              <div className="flex justify-between gap-3"><dt>{job.status === "delivered" ? "Repair total" : "Estimated total"}</dt><dd className="font-bold">{rs(job.total)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{job.status === "delivered" ? "Amount received" : "Advance received"}</dt><dd className="font-bold">{rs(job.paid)}</dd></div>
              <div className="ticket-balance flex justify-between gap-3 border-t border-slate-200 pt-2 text-[14px] font-black"><dt>{job.status === "delivered" ? "Balance due" : "Estimated balance"}</dt><dd className="text-orange-700">{rs(balance)}</dd></div>
              {credit > 0 && <div className="flex justify-between gap-3 text-emerald-700"><dt>Customer credit</dt><dd>{rs(credit)}</dd></div>}
              {job.status === "cancelled" && (
                <p className="border-t border-slate-200 pt-2 text-[10px] leading-snug text-slate-600">
                  Cancelled — this is the original estimate, not a new charge. Any advance or refund must be reconciled separately.
                </p>
              )}
            </dl>
          </section>

          <section className="ticket-section ticket-warranty flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-[12px]">
            <span className="text-lg" aria-hidden="true">✦</span>
            <div>
              <p className="font-bold text-[#171717]">Repair warranty</p>
              <p className="mt-0.5 text-slate-700">
                {job.status === "cancelled"
                  ? "Not applicable to a cancelled repair"
                  : job.warrantyDays > 0
                    ? warrantyUntil
                      ? `${job.warrantyDays} days · valid until ${fmtDate(warrantyUntil)}`
                      : `${job.warrantyDays} days from the delivery date`
                    : "No warranty recorded for this repair"}
              </p>
            </div>
          </section>

          <p className="ticket-section text-[10px] leading-relaxed text-slate-600">
            Keep this receipt and present the job number when collecting your device. Warranty applies to the recorded repair only; physical or water damage
            is not covered. Please keep a backup of your personal data.
          </p>

          <div className="ticket-section grid grid-cols-2 gap-8 pt-7 text-[10px] text-slate-600">
            <div className="border-t border-slate-500 pt-1.5">Customer signature</div>
            <div className="border-t border-slate-500 pt-1.5">For {SHOP_NAME}</div>
          </div>
        </div>

        <div className="ticket-footer border-t border-slate-200 bg-slate-50 px-5 py-3 text-center text-[11px] font-semibold tracking-wide text-slate-600 sm:px-8">
          THANK YOU FOR CHOOSING STE MOBILE CARE
        </div>
        <div className="ticket-bottom-rule h-1.5 bg-orange-500" aria-hidden="true" />
      </article>
      <p className="no-print mt-3 text-center text-xs text-slate-500">Printing uses a white background and black text for clear grayscale copies. You can also choose “Save as PDF” in the print dialog.</p>
    </div>
  );
}
