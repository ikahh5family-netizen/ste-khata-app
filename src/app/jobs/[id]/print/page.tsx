import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs, jobParts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHOP_NAME, SHOP_FULL_NAME } from "@/lib/constants";
import { rs, fmtDateTime, fmtDate, jobNo } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { AppleLogo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PrintJob({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const id = parseInt((await params).id, 10);
  if (!Number.isFinite(id)) notFound();
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) notFound();
  const used = await db.select().from(jobParts).where(eq(jobParts.jobId, id));
  const due = job.total - job.paid;
  const warrantyTill = job.deliveredAt && job.warrantyDays ? new Date(job.deliveredAt.getTime() + job.warrantyDays * 86400000) : null;

  return (
    <div className="mx-auto max-w-md">
      <div className="no-print mb-4 flex justify-between">
        <Link href={`/jobs/${id}`} className="btn-light">
          ← Back
        </Link>
        <PrintButton />
      </div>
      <div className="print-area card font-mono text-sm">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/ste-logo.png" alt="STE Logo" className="mx-auto h-20 w-20 rounded-xl" />
          <div className="mt-1 text-lg font-bold">{SHOP_FULL_NAME}</div>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
            <AppleLogo className="h-3 w-3" />
            iPhone &amp; Mobile Repair · Parts · Accessories · Since 2003
          </div>
          <div className="mt-2 border-y border-dashed border-slate-300 py-1 font-bold">
            {job.status === "delivered" ? "REPAIR BILL" : "JOB CARD / RECEIPT"}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <L k="Job No" v={jobNo(job.id)} />
          <L k="Date" v={fmtDateTime(job.receivedAt)} />
          <L k="Customer" v={job.customerName} />
          {job.phone && <L k="Mobile" v={job.phone} />}
          <L k="Device" v={job.deviceModel} />
          {job.imei && <L k="IMEI" v={job.imei} />}
          <L k="Repair" v={job.repairType} />
          {job.issue && <L k="Problem" v={job.issue} />}
        </div>
        {job.status === "delivered" && used.length > 0 && (
          <div className="mt-3 border-t border-dashed border-slate-300 pt-2">
            <div className="text-xs text-slate-500">Parts replaced:</div>
            {used.map((u) => (
              <div key={u.id}>
                • {u.name}
                {u.qty > 1 ? ` × ${u.qty}` : ""}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-2">
          <L k={job.status === "delivered" ? "Total" : "Estimate"} v={rs(job.total)} bold />
          <L k="Paid" v={rs(job.paid)} />
          <L k="Balance" v={rs(Math.max(0, due))} bold />
          {job.warrantyDays > 0 && <L k="Warranty" v={warrantyTill ? `till ${fmtDate(warrantyTill)}` : `${job.warrantyDays} days`} />}
        </div>
        <div className="mt-4 border-t border-dashed border-slate-300 pt-2 text-[11px] leading-snug text-slate-500">
          * Phone will be handed over only on showing the job card. * Shop is not responsible if not collected within 30 days. * No warranty on water
          damage / physical damage. * Data backup is the customer&apos;s responsibility.
        </div>
        <div className="mt-6 flex justify-between text-xs">
          <span>Customer Sign</span>
          <span>For {SHOP_NAME}</span>
        </div>
      </div>
    </div>
  );
}

function L({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span>{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
