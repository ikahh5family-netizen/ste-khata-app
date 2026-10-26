import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { customers, parts, repairJobs, jobParts, sales, saleItems, payments, expenses, purchases } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const num = (v: unknown, def = 0) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
};
const str = (v: unknown, def = "") => (v === null || v === undefined ? def : String(v));
const date = (v: unknown, fallback?: Date) => {
  if (v === null || v === undefined || v === "") return fallback ?? null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? fallback ?? null : d;
};

/**
 * Restore the whole database from a backup JSON (sent by the client-side
 * Import Database Backup button). IDs are preserved so relationships
 * (jobs -> customers, sales -> items, etc.) stay intact.
 * Used when the DB is empty/crashed; replaces all rows in one transaction.
 */
export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = (await req.json()) as { data?: Record<string, Record<string, unknown>[]> };
    const data = body?.data;
    if (!data || typeof data !== "object") {
      return Response.json({ ok: false, error: "Invalid backup file" }, { status: 400 });
    }
    for (const k of ["customers", "parts", "repairJobs", "jobParts", "sales", "saleItems", "payments", "expenses", "purchases"]) {
      if (!Array.isArray(data[k])) {
        return Response.json({ ok: false, error: `Backup is incomplete — missing "${k}"` }, { status: 400 });
      }
    }

    const counts: Record<string, number> = {};
    await db.transaction(async (tx) => {
      // Delete children first (FK order)
      await tx.delete(jobParts);
      await tx.delete(saleItems);
      await tx.delete(payments);
      await tx.delete(purchases);
      await tx.delete(repairJobs);
      await tx.delete(sales);
      await tx.delete(expenses);
      await tx.delete(customers);
      await tx.delete(parts);

      // Insert with original IDs
      if (data.parts.length) {
        await tx.insert(parts).values(
          data.parts.map((r) => ({
            id: num(r.id),
            name: str(r.name, "Part"),
            category: str(r.category, "Other"),
            model: str(r.model),
            costPrice: num(r.costPrice),
            salePrice: num(r.salePrice),
            stock: num(r.stock),
            minStock: num(r.minStock, 1),
            createdAt: date(r.createdAt, new Date())!,
          }))
        );
      }
      if (data.customers.length) {
        await tx.insert(customers).values(
          data.customers.map((r) => ({
            id: num(r.id),
            name: str(r.name, "Customer"),
            phone: str(r.phone),
            notes: str(r.notes),
            createdAt: date(r.createdAt, new Date())!,
          }))
        );
      }
      if (data.repairJobs.length) {
        await tx.insert(repairJobs).values(
          data.repairJobs.map((r) => ({
            id: num(r.id),
            customerId: r.customerId === null || r.customerId === undefined ? null : num(r.customerId),
            customerName: str(r.customerName, "Customer"),
            phone: str(r.phone),
            deviceModel: str(r.deviceModel, "iPhone"),
            imei: str(r.imei),
            passcode: str(r.passcode),
            repairType: str(r.repairType, "Other"),
            issue: str(r.issue),
            status: str(r.status, "received"),
            total: num(r.total),
            partsCost: num(r.partsCost),
            paid: num(r.paid),
            // v1 backups predate advance tracking. Undelivered Paid is the
            // best-known advance; delivered historical advances are unknown.
            advancePaid: r.advancePaid == null
              ? r.status === "delivered" ? 0 : Math.max(0, num(r.paid))
              : Math.max(0, num(r.advancePaid)),
            warrantyDays: num(r.warrantyDays),
            technician: str(r.technician),
            notes: str(r.notes),
            receivedAt: date(r.receivedAt, new Date())!,
            deliveredAt: date(r.deliveredAt),
          }))
        );
      }
      if (data.jobParts.length) {
        await tx.insert(jobParts).values(
          data.jobParts.map((r) => ({
            id: num(r.id),
            jobId: num(r.jobId),
            partId: r.partId === null || r.partId === undefined ? null : num(r.partId),
            name: str(r.name, "Part"),
            qty: num(r.qty, 1),
            cost: num(r.cost),
          }))
        );
      }
      if (data.sales.length) {
        await tx.insert(sales).values(
          data.sales.map((r) => ({
            id: num(r.id),
            customerId: r.customerId === null || r.customerId === undefined ? null : num(r.customerId),
            customerName: str(r.customerName, "Walk-in"),
            phone: str(r.phone),
            subtotal: num(r.subtotal),
            discount: num(r.discount),
            total: num(r.total),
            cost: num(r.cost),
            paid: num(r.paid),
            paymentMode: str(r.paymentMode, "cash"),
            createdAt: date(r.createdAt, new Date())!,
          }))
        );
      }
      if (data.saleItems.length) {
        await tx.insert(saleItems).values(
          data.saleItems.map((r) => ({
            id: num(r.id),
            saleId: num(r.saleId),
            partId: r.partId === null || r.partId === undefined ? null : num(r.partId),
            name: str(r.name, "Item"),
            qty: num(r.qty, 1),
            price: num(r.price),
            cost: num(r.cost),
          }))
        );
      }
      if (data.payments.length) {
        await tx.insert(payments).values(
          data.payments.map((r) => ({
            id: num(r.id),
            customerId: num(r.customerId),
            amount: num(r.amount),
            mode: str(r.mode, "cash"),
            note: str(r.note),
            createdAt: date(r.createdAt, new Date())!,
          }))
        );
      }
      if (data.expenses.length) {
        await tx.insert(expenses).values(
          data.expenses.map((r) => ({
            id: num(r.id),
            category: str(r.category, "Other"),
            amount: num(r.amount),
            note: str(r.note),
            createdAt: date(r.createdAt, new Date())!,
          }))
        );
      }
      if (data.purchases.length) {
        await tx.insert(purchases).values(
          data.purchases.map((r) => ({
            id: num(r.id),
            partId: r.partId === null || r.partId === undefined ? null : num(r.partId),
            partName: str(r.partName, "Part"),
            supplier: str(r.supplier),
            qty: num(r.qty),
            unitCost: num(r.unitCost),
            total: num(r.total),
            createdAt: date(r.createdAt, new Date())!,
          }))
        );
      }

      // Reset sequences so new rows continue from restored max IDs
      const seqs: [string, string][] = [
        ["parts", "parts_id_seq"],
        ["customers", "customers_id_seq"],
        ["repair_jobs", "repair_jobs_id_seq"],
        ["job_parts", "job_parts_id_seq"],
        ["sales", "sales_id_seq"],
        ["sale_items", "sale_items_id_seq"],
        ["payments", "payments_id_seq"],
        ["expenses", "expenses_id_seq"],
        ["purchases", "purchases_id_seq"],
      ];
      for (const [table, seq] of seqs) {
        await tx.execute(sql.raw(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 1))`));
      }
    });

    for (const k of Object.keys(data)) counts[k] = Array.isArray(data[k]) ? data[k].length : 0;
    return Response.json({ ok: true, counts });
  } catch (err) {
    console.error("POST /api/restore error:", err);
    return Response.json({ ok: false, error: "Restore failed on server" }, { status: 500 });
  }
}
