import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { customers, parts, repairJobs, jobParts, sales, saleItems, payments, expenses, purchases } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Online backup of all live PostgreSQL records. The JSON is unencrypted and
 * may contain private customer information; prevent caching at every layer. */
export async function GET() {
  try {
    await ensureSchema();
    const [c, p, j, jp, s, si, pay, e, pu] = await Promise.all([
      db.select().from(customers).orderBy(asc(customers.id)),
      db.select().from(parts).orderBy(asc(parts.id)),
      db.select().from(repairJobs).orderBy(asc(repairJobs.id)),
      db.select().from(jobParts).orderBy(asc(jobParts.id)),
      db.select().from(sales).orderBy(asc(sales.id)),
      db.select().from(saleItems).orderBy(asc(saleItems.id)),
      db.select().from(payments).orderBy(asc(payments.id)),
      db.select().from(expenses).orderBy(asc(expenses.id)),
      db.select().from(purchases).orderBy(asc(purchases.id)),
    ]);

    const backup = {
      app: "STE Mobile Care",
      version: 2,
      exportedAt: new Date().toISOString(),
      counts: {
        customers: c.length,
        parts: p.length,
        repairJobs: j.length,
        jobParts: jp.length,
        sales: s.length,
        saleItems: si.length,
        payments: pay.length,
        expenses: e.length,
        purchases: pu.length,
      },
      data: {
        customers: c,
        parts: p,
        repairJobs: j,
        jobParts: jp,
        sales: s,
        saleItems: si,
        payments: pay,
        expenses: e,
        purchases: pu,
      },
    };

    const fileName = `ste-mobile-care-backup-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("GET /api/backup error:", err);
    return Response.json({ ok: false, error: "Backup could not be created" }, { status: 500 });
  }
}
