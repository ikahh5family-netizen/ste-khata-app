import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs, jobParts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHOP_NAME, SHOP_FULL_NAME, SHOP_PHONE, SHOP_ADDRESS, PRINT_TERMS, statusInfo } from "@/lib/constants";
import { rs, fmtDateTimeFull, fmtDate, jobNo } from "@/lib/format";
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
    <div className="mx-auto max-w-[760px]">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/jobs/${id}`} className="btn-light">
          ← Back
        </Link>
        <div className="text-xs text-slate-500">Tip: print on A4 / A5 — works in black &amp; white too</div>
        <PrintButton />
      </div>

      <div className="print-area overflow-hidden rounded-xl border border-neutral-300 bg-white text-neutral-900">
        {/* ============ HEADER ============ */}
        <div className="relative overflow-hidden px-6 pt-5 pb-4">
          {/* corner accent */}
          <div aria-hidden className="absolute -right-10 -top-12 h-32 w-44 rounded-bl-[100%] bg-orange-500/90 print:bg-black" />
          <div className="absolute right-5 top-3 text-right">
            <AppleLogo className="ml-auto h-3.5 w-3.5 text-black print:text-white" />
            <div className="mt-0.5 text-[8px] font-bold uppercase leading-tight tracking-[0.12em] text-black print:text-white">
              Customer
              <br />
              Copy
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <Logo className="h-[62px] w-[62px]" rounded="rounded-lg" />
            <div className="min-w-0 pt-0.5">
              <div className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                {SHOP_FULL_NAME} · Since 2003
              </div>
              <h1 className="mt-0.5 text-[21px] font-extrabold leading-none tracking-tight">{SHOP_NAME}</h1>
              <div className="mt-1 text-[9.5px] leading-tight text-neutral-500">iPhone repair · Genuine care · Parts &amp; accessories</div>
            </div>
          </div>
        </div>

        {/* orange rule */}
        <div className="h-[3px] bg-orange-500 print:bg-black" />

        {/* ============ CONTACT STRIP ============ */}
        <div className="grid grid-cols-[1.9fr_1fr] gap-4 border-b border-neutral-300 px-6 py-2.5">
          <div>
            <div className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-orange-600 print:text-black">Visit our shop</div>
            <div className="mt-0.5 text-[9.5px] leading-snug text-neutral-700">{SHOP_ADDRESS}</div>
          </div>
          <div className="text-right">
            <div className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-orange-600 print:text-black">Call / WhatsApp</div>
            <div className="mt-0.5 text-[11px] font-bold tabular-nums">{SHOP_PHONE}</div>
          </div>
        </div>

        {/* ============ BODY (watermark lives here) ============ */}
        <div className="relative px-6 py-4">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
            <span className="select-none text-[120px] font-extrabold leading-none tracking-[0.1em] text-neutral-900/[0.045] print:text-neutral-900/[0.06]">
              STE
            </span>
          </div>

          <div className="relative z-10">
            {/* ---- invoice no + status ---- */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {isBill ? "Repair Invoice" : "Repair Job Card"}
                </div>
                <div className="text-[23px] font-extrabold leading-none tracking-tight">{jobNo(job.id)}</div>
              </div>
              <span
                className={`rounded border px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.12em] ${
                  isBill ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-400 text-neutral-700"
                }`}
              >
                {status.label}
              </span>
            </div>

            {/* ---- received / delivered ---- */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stamp label="Received at · Date & Time" value={fmtDateTimeFull(job.receivedAt)} />
              <Stamp
                label="Delivered at · Date & Time"
                value={job.deliveredAt ? fmtDateTimeFull(job.deliveredAt) : "— pending —"}
                muted={!job.deliveredAt}
              />
            </div>

            {/* ---- customer ---- */}
            <SectionTitle>Customer Information</SectionTitle>
            <Panel>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                <DL label="Customer" value={job.customerName} />
                <DL label="Contact Number" value={job.phone} />
              </div>
            </Panel>

            {/* ---- device ---- */}
            <SectionTitle>Device &amp; Repair</SectionTitle>
            <Panel>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                <DL label="Device Model" value={job.deviceModel} />
                <DL label="Service Requested" value={job.repairType} />
                <DL label="IMEI / Serial" value={job.imei} />
                <DL label="Technician" value={job.technician} />
                {job.issue && <DL label="Reported Issue" value={job.issue} span />}
                {job.notes && <DL label="Received Condition / Notes" value={job.notes} span />}
              </div>
            </Panel>

            {/* ---- parts ---- */}
            {used.length > 0 && (
              <>
                <SectionTitle>Parts Used</SectionTitle>
                <div className="overflow-hidden rounded border border-neutral-300">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-neutral-100">
                        <th className="border-b border-neutral-300 px-3 py-1.5 text-left text-[7.5px] font-bold uppercase tracking-[0.12em] text-neutral-600">
                          Description
                        </th>
                        <th className="w-16 border-b border-neutral-300 px-3 py-1.5 text-right text-[7.5px] font-bold uppercase tracking-[0.12em] text-neutral-600">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {used.map((u) => (
                        <tr key={u.id} className="border-b border-neutral-200 last:border-0">
                          <td className="px-3 py-1.5">{u.name}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{u.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ---- payment ---- */}
            <div className="mt-4 overflow-hidden rounded border border-neutral-300">
              <div className="flex items-center justify-between bg-neutral-900 px-3 py-1.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white">Payment Summary</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/70">PKR</span>
              </div>
              <div className="divide-y divide-neutral-200">
                <PayRow k={isBill ? "Repair total" : "Estimated total"} v={rs(job.total)} />
                {job.advancePaid > 0 && !isBill && <PayRow k="Advance received" v={rs(job.advancePaid)} />}
                <PayRow k="Amount received" v={rs(job.paid)} />
              </div>
              <div className="flex items-center justify-between border-t-2 border-neutral-900 bg-orange-50 px-3 py-2 print:bg-white">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wide">Balance due</span>
                <span className="text-[15px] font-extrabold tabular-nums">{rs(due)}</span>
              </div>
            </div>

            {/* ---- warranty ---- */}
            <div className="mt-3 rounded border border-neutral-300 px-3 py-2">
              <div className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-orange-600 print:text-black">Repair Warranty</div>
              <div className="mt-0.5 text-[10px] leading-snug">
                {job.warrantyDays > 0 ? (
                  <>
                    <b>{job.warrantyDays} days</b> on the replaced part
                    {warrantyTill && (
                      <>
                        {" "}
                        · valid till <b>{fmtDate(warrantyTill)}</b>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-500">No warranty recorded for this repair</span>
                )}
              </div>
            </div>

            {/* ---- terms ---- */}
            <ol className="mt-3 list-decimal space-y-0.5 pl-3.5 text-[8px] leading-relaxed text-neutral-600">
              {PRINT_TERMS.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>

            {/* ---- signatures ---- */}
            <div className="mt-8 grid grid-cols-2 gap-10">
              <div className="border-t border-neutral-800 pt-1 text-center text-[8.5px] text-neutral-600">Customer Signature</div>
              <div className="border-t border-neutral-800 pt-1 text-center text-[8.5px] text-neutral-600">For {SHOP_NAME}</div>
            </div>

            <div className="mt-4 text-center text-[8.5px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Thank you for choosing {SHOP_NAME}
            </div>
          </div>
        </div>

        <div className="h-[3px] bg-orange-500 print:bg-black" />
      </div>

      <p className="no-print mt-3 text-center text-xs text-slate-500">
        Printing uses a white background and black text, so it stays clear on grayscale printers. To save a PDF, choose
        &quot;Save as PDF&quot; in the print dialog.
      </p>
    </div>
  );
}

/* ---------- small building blocks ---------- */

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 mb-1.5 flex items-center gap-1.5">
      <span className="h-[7px] w-[7px] rotate-45 bg-orange-500 print:bg-black" />
      <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-neutral-700">{children}</span>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded border border-neutral-300 px-3.5 py-2.5">{children}</div>;
}

function DL({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <dt className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</dt>
      <dd className="mt-0.5 break-words text-[11px] font-semibold leading-snug">{value?.trim() ? value : <span className="font-normal text-neutral-400">—</span>}</dd>
    </div>
  );
}

function Stamp({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded border border-neutral-300 px-3 py-1.5">
      <div className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-[10.5px] font-semibold tabular-nums ${muted ? "text-neutral-400" : ""}`}>{value}</div>
    </div>
  );
}

function PayRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[10px] text-neutral-700">{k}</span>
      <span className="text-[11px] font-semibold tabular-nums">{v}</span>
    </div>
  );
}
