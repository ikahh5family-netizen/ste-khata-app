import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { customers, repairJobs, sales, payments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { StatCard, StatusBadge } from "@/components/ui";
import { ApiForm, ApiActionButton } from "@/components/ApiForm";
import { rs, fmtDateTime, jobNo, invNo, waLink } from "@/lib/format";
import { PAYMENT_MODES, SHOP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Entry = { date: Date; title: string; sub: string; debit: number; credit: number; href?: string; paymentId?: number; status?: string };

export default async function CustomerLedger({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const id = parseInt((await params).id, 10);
  if (!Number.isFinite(id)) notFound();
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  if (!c) notFound();
  const [jobs, sl, pays] = await Promise.all([
    db.select().from(repairJobs).where(eq(repairJobs.customerId, id)).orderBy(desc(repairJobs.receivedAt)),
    db.select().from(sales).where(eq(sales.customerId, id)).orderBy(desc(sales.createdAt)),
    db.select().from(payments).where(eq(payments.customerId, id)).orderBy(desc(payments.createdAt)),
  ]);

  const entries: Entry[] = [];
  for (const j of jobs) {
    const counted = j.status === "delivered";
    entries.push({
      date: j.deliveredAt ?? j.receivedAt,
      title: `${jobNo(j.id)} · ${j.deviceModel} – ${j.repairType}`,
      sub: counted ? `Bill ${rs(j.total)}, paid ${rs(j.paid)}` : `Estimate ${rs(j.total)}, advance ${rs(j.paid)} (not delivered yet)`,
      debit: counted ? j.total : 0,
      credit: counted ? j.paid : 0,
      href: `/jobs/${j.id}`,
      status: j.status,
    });
  }
  for (const s of sl) {
    entries.push({
      date: s.createdAt,
      title: `${invNo(s.id)} · Parts Sale`,
      sub: `Bill ${rs(s.total)}, paid ${rs(s.paid)}`,
      debit: s.total,
      credit: s.paid,
      href: `/sales/${s.id}`,
    });
  }
  for (const p of pays) {
    entries.push({
      date: p.createdAt,
      title: `💵 Payment received (${p.mode.toUpperCase()})`,
      sub: p.note,
      debit: 0,
      credit: p.amount,
      paymentId: p.id,
    });
  }
  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalDebit = entries.reduce((a, e) => a + e.debit, 0);
  const totalCredit = entries.reduce((a, e) => a + e.credit, 0);
  const balance = totalDebit - totalCredit;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/khata" className="text-sm text-slate-500">
        ← Khata
      </Link>
      <div className="mb-4 mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          {c.phone && (
            <a href={`tel:${c.phone}`} className="text-sm text-indigo-600">
              📞 {c.phone}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          {c.phone && balance > 0 && (
            <a
              href={waLink(c.phone, `Hello ${c.name} 🙏\nYou have ${rs(balance)} pending at ${SHOP_NAME}. Please clear it soon. Thank you!`)}
              target="_blank"
              rel="noreferrer"
              className="btn bg-[#25D366] text-white"
            >
              WhatsApp Reminder
            </a>
          )}
          <Link href={`/jobs/new?customerName=${encodeURIComponent(c.name)}&phone=${encodeURIComponent(c.phone)}`} className="btn-light">
            + Job
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Total Billed" value={rs(totalDebit)} />
        <StatCard label="Total Received" value={rs(totalCredit)} tone="emerald" />
        <StatCard label={balance >= 0 ? "Balance (to collect)" : "Advance"} value={rs(Math.abs(balance))} tone={balance > 0 ? "rose" : "emerald"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-0 lg:col-span-2">
          <div className="border-b border-slate-100 px-4 py-3 font-semibold">Ledger</div>
          {entries.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No entries.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entries.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    {e.href ? (
                      <Link href={e.href} className="font-medium hover:text-indigo-600">
                        {e.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{e.title}</span>
                    )}
                    <div className="text-xs text-slate-500">
                      {fmtDateTime(e.date)} {e.sub && `· ${e.sub}`}
                    </div>
                    {e.status && e.status !== "delivered" && (
                      <div className="mt-1">
                        <StatusBadge status={e.status} />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {e.debit - e.credit > 0 && <div className="font-semibold text-rose-600">+{rs(e.debit - e.credit)}</div>}
                    {e.paymentId && <div className="font-semibold text-emerald-600">−{rs(e.credit)}</div>}
                    {e.paymentId && (
                      <ApiActionButton endpoint="/api/khata" payload={{ action: "deletePayment", id: e.paymentId }} className="text-[11px] text-rose-400 hover:underline">
                        delete
                      </ApiActionButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <ApiForm endpoint="/api/khata" actionName="addPayment" resetOnSuccess className="card space-y-2">
            <h2 className="font-semibold">💵 Payment Received</h2>
            <input type="hidden" name="customerId" value={c.id} />
            <input name="amount" type="number" min={1} required defaultValue={balance > 0 ? balance : ""} className="input" placeholder="Amount Rs" />
            <select name="mode" className="input">
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input name="note" className="input" placeholder="Note (optional)" />
            <button type="submit" className="btn-green w-full">
              Save Payment
            </button>
          </ApiForm>

          <ApiForm endpoint="/api/khata" actionName="saveCustomer" className="card space-y-2">
            <h2 className="font-semibold">✏️ Customer Details</h2>
            <input type="hidden" name="id" value={c.id} />
            <input name="name" defaultValue={c.name} className="input" />
            <input name="phone" defaultValue={c.phone} className="input" placeholder="Mobile" />
            <input name="notes" defaultValue={c.notes} className="input" placeholder="Notes" />
            <button type="submit" className="btn-light w-full">
              Save
            </button>
          </ApiForm>
        </div>
      </div>
    </div>
  );
}
