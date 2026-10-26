import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { sales, saleItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHOP_NAME, SHOP_FULL_NAME } from "@/lib/constants";
import { rs, fmtDateTime, invNo, waLink } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { ConfirmDeleteButton } from "@/components/ApiForm";
import { AppleLogo } from "@/components/ui";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function SaleDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  await ensureSchema();
  const id = parseInt((await params).id, 10);
  const { new: isNew } = await searchParams;
  if (!Number.isFinite(id)) notFound();
  const [s] = await db.select().from(sales).where(eq(sales.id, id));
  if (!s) notFound();
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  const due = s.total - s.paid;
  const msg = `${SHOP_NAME}\nBill ${invNo(s.id)} – ${fmtDateTime(s.createdAt)}\n${items.map((i) => `${i.name} x${i.qty} = ${rs(i.qty * i.price)}`).join("\n")}\n${s.discount ? `Discount: -${rs(s.discount)}\n` : ""}Total: ${rs(s.total)}\nPaid: ${rs(s.paid)}${due > 0 ? `\nDue: ${rs(due)}` : ""}\nThank you 🙏`;

  return (
    <div className="mx-auto max-w-md">
      {isNew && (
        <div className="no-print mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">✅ Sale saved!</div>
      )}
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <Link href="/sales" className="btn-light">
          ← Sales
        </Link>
        <Link href="/sales/new" className="btn-green">
          + New Sale
        </Link>
        <PrintButton />
        {s.phone && (
          <a href={waLink(s.phone, msg)} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white">
            WhatsApp
          </a>
        )}
      </div>
      <div className="print-area overflow-hidden rounded-2xl border border-neutral-300 bg-white text-sm shadow-sm">
        <div className="bg-black px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-14 w-14 ring-2 ring-orange-500 print:ring-white" rounded="rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-extrabold leading-tight tracking-wide text-orange-400 print:text-white">{SHOP_FULL_NAME}</div>
              <div className="flex items-center gap-1 text-[10px] leading-tight text-neutral-300 print:text-white">
                <AppleLogo className="h-2.5 w-2.5" />
                iPhone &amp; Mobile Repair · Parts · Accessories · Since 2003
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between bg-orange-500 px-4 py-1.5 print:bg-black">
          <span className="text-sm font-extrabold tracking-widest text-black print:text-white">CASH MEMO</span>
          <span className="rounded bg-black px-2 py-0.5 text-[11px] font-bold tracking-wide text-orange-400 print:bg-white print:text-black">{invNo(s.id)}</span>
        </div>
        <div className="px-4 py-3">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500">{fmtDateTime(s.createdAt)}</span>
        </div>
        <div className="text-xs">
          <b>Customer:</b> {s.customerName} {s.phone}
        </div>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="border-b border-dashed border-slate-300 text-left">
              <th className="py-1">Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td className="py-1 pr-1">{i.name}</td>
                <td className="text-right">{i.qty}</td>
                <td className="text-right">{i.price}</td>
                <td className="text-right">{i.qty * i.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 space-y-1 border-t border-dashed border-slate-300 pt-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{rs(s.subtotal)}</span>
          </div>
          {s.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{rs(s.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{rs(s.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid ({s.paymentMode.toUpperCase()})</span>
            <span>{rs(s.paid)}</span>
          </div>
          {due > 0 && (
            <div className="flex justify-between font-bold">
              <span>Balance</span>
              <span>{rs(due)}</span>
            </div>
          )}
        </div>
        </div>
        <div className="bg-black px-4 py-1.5 text-center text-[10px] font-semibold tracking-wide text-orange-400 print:text-white">
          Thank you! Please visit again 🙏
        </div>
      </div>
      <div className="no-print mt-4 text-sm text-slate-500">
        Profit: <b className="text-emerald-600">{rs(s.total - s.cost)}</b>
      </div>
      <div className="no-print mt-4">
        <ConfirmDeleteButton endpoint="/api/sales" payload={{ action: "delete", id: s.id }} confirmText="Delete this sale? Stock will be restored.">
          🗑️ Delete Sale
        </ConfirmDeleteButton>
      </div>
    </div>
  );
}
