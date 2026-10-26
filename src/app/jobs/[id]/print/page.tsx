import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs, jobParts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHOP_NAME, SHOP_FULL_NAME, SHOP_PHONE, SHOP_ADDRESS, PRINT_TERMS, statusInfo } from "@/lib/constants";
import { rs, fmtDateTime, fmtDate, jobNo } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { AppleLogo } from "@/components/ui";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PrintJob({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const id = parseInt((await params).id, 10);
  if (!Number.isFinite(id)) notFound();
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) notFound();
  const used = await db.select().from(jobParts).where(eq(jobParts.jobId, id));

  const due = Math.max(0, job.total - job.paid);
  const isBill = job.status === "delivered";
  const warrantyTill = job.deliveredAt && job.warrantyDays ? new Date(job.deliveredAt.getTime() + job.warrantyDays * 86400000) : null;
  const status = statusInfo(job.status);

  return (
    <div className="mx-auto max-w-[420px]">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link href={`/jobs/${id}`} className="btn-light">
          ← Back
        </Link>
        <div className="text-xs text-slate-500">Tip: print on A5 or 80mm thermal paper</div>
        <PrintButton />
      </div>

      <div className="print-area overflow-hidden rounded-2xl border border-neutral-300 bg-white shadow-sm">
        {/* ---------- Header: orange + black ---------- */}
        <div className="bg-black px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <Logo className="h-14 w-14 ring-2 ring-orange-500 print:ring-white" rounded="rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-extrabold leading-tight tracking-wide text-orange-400 print:text-white">{SHOP_FULL_NAME}</div>
              <div className="flex items-center gap-1 text-[10px] leading-tight text-neutral-300 print:text-white">
                <AppleLogo className="h-2.5 w-2.5" />
                iPhone &amp; Mobile Repair · Parts · Accessories
              </div>
              <div className="text-[10px] leading-tight text-neutral-400 print:text-white">
                Since 2003{SHOP_PHONE && ` · ${SHOP_PHONE}`}
                {SHOP_ADDRESS && ` · ${SHOP_ADDRESS}`}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Title strip ---------- */}
        <div className="flex items-center justify-between bg-orange-500 px-4 py-1.5 print:bg-black">
          <span className="text-sm font-extrabold tracking-widest text-black print:text-white">{isBill ? "REPAIR BILL" : "JOB CARD"}</span>
          <span className="rounded bg-black px-2 py-0.5 text-[11px] font-bold tracking-wide text-orange-400 print:bg-white print:text-black">{jobNo(job.id)}</span>
        </div>

        <div className="px-4 py-3 text-[12px] text-neutral-900">
          {/* ---------- Date + status ---------- */}
          <div className="mb-2 flex items-center justify-between border-b border-dashed border-neutral-300 pb-2">
            <div>
              <span className="text-neutral-500">Received:</span> <b>{fmtDateTime(job.receivedAt)}</b>
            </div>
            <span className="rounded-full border border-neutral-400 px-2 py-0.5 text-[10px] font-bold uppercase">{status.label}</span>
          </div>

          {/* ---------- Customer & Device ---------- */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <Section title="CUSTOMER" />
            <Section title="DEVICE" />
            <div className="space-y-0.5">
              <Val v={job.customerName} strong />
              {job.phone && <Val v={job.phone} />}
            </div>
            <div className="space-y-0.5">
              <Val v={job.deviceModel} strong />
              {job.imei && <Val v={`IMEI: ${job.imei}`} small />}
              {job.passcode && <Val v={`Code: ${job.passcode}`} small />}
            </div>
          </div>

          {/* ---------- Repair details ---------- */}
          <div className="mt-2.5 rounded-lg border border-neutral-400 bg-neutral-50 px-2.5 py-2 print:bg-white">
            <Row k="Repair" v={job.repairType} strong />
            {job.issue && <Row k="Problem" v={job.issue} />}
            {job.technician && <Row k="Technician" v={job.technician} />}
            {job.notes && <Row k="Notes" v={job.notes} />}
          </div>

          {/* ---------- Parts table ---------- */}
          {isBill && used.length > 0 && (
            <table className="mt-2.5 w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-2 py-1 text-left font-semibold">Parts Replaced</th>
                  <th className="px-2 py-1 text-right font-semibold">Qty</th>
                </tr>
              </thead>
              <tbody>
                {used.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-200">
                    <td className="px-2 py-1">{u.name}</td>
                    <td className="px-2 py-1 text-right">{u.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ---------- Amounts ---------- */}
          <div className="mt-2.5 rounded-lg border-2 border-black">
            <Money k={isBill ? "Total Amount" : "Estimate"} v={rs(job.total)} />
            {!isBill && job.advancePaid > 0 && <Money k="Advance Received" v={rs(job.advancePaid)} />}
            <Money k="Paid" v={rs(job.paid)} />
            <div className="flex items-center justify-between bg-orange-500 px-2.5 py-1.5 print:bg-black">
              <span className="text-[12px] font-extrabold text-black print:text-white">BALANCE DUE</span>
              <span className="text-[15px] font-extrabold text-black print:text-white">{rs(due)}</span>
            </div>
          </div>

          {/* ---------- Warranty ---------- */}
          {job.warrantyDays > 0 && (
            <div className="mt-2 rounded-lg border border-neutral-900 px-2.5 py-1.5 text-center text-[11px]">
              🛡️ <b>Warranty:</b> {job.warrantyDays} days
              {warrantyTill && (
                <>
                  {" "}
                  · valid till <b>{fmtDate(warrantyTill)}</b>
                </>
              )}
            </div>
          )}

          {/* ---------- Terms ---------- */}
          <div className="mt-2.5 border-t border-dashed border-neutral-400 pt-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wide text-neutral-600">Terms &amp; Conditions</div>
            <ol className="mt-0.5 list-decimal space-y-0 pl-3.5 text-[9px] leading-snug text-neutral-600">
              {PRINT_TERMS.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>

          {/* ---------- Signatures ---------- */}
          <div className="mt-5 flex items-end justify-between gap-4 text-[10px]">
            <div className="flex-1 border-t border-neutral-800 pt-0.5 text-center">Customer Signature</div>
            <div className="flex-1 border-t border-neutral-800 pt-0.5 text-center">For {SHOP_NAME}</div>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <div className="bg-black px-4 py-1.5 text-center text-[10px] font-semibold tracking-wide text-orange-400 print:text-white">
          Thank you for choosing {SHOP_FULL_NAME} 🙏
        </div>
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return <div className="text-[9px] font-bold uppercase tracking-wider text-orange-600 print:text-black">{title}</div>;
}

function Val({ v, strong, small }: { v: string; strong?: boolean; small?: boolean }) {
  return <div className={`${strong ? "font-bold" : ""} ${small ? "text-[10px] text-neutral-600" : ""} break-words`}>{v}</div>;
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex gap-2 leading-snug">
      <span className="w-[62px] shrink-0 text-neutral-500">{k}</span>
      <span className={`flex-1 break-words ${strong ? "font-bold" : ""}`}>{v}</span>
    </div>
  );
}

function Money({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-300 px-2.5 py-1">
      <span className="text-[11px] text-neutral-700">{k}</span>
      <span className="text-[13px] font-bold">{v}</span>
    </div>
  );
}
