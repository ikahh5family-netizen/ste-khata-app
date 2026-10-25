import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { sales } from "@/db/schema";
import { desc } from "drizzle-orm";
import { parseRequestData, respondResult } from "@/lib/api-body";
import { createSaleRecord, deleteSaleRecord, type SaleInput } from "@/lib/shop-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const list = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(200);
    return Response.json({ ok: true, sales: list });
  } catch (err) {
    console.error("GET /api/sales error:", err);
    return Response.json({ ok: false, error: "Could not load sales" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data, isJson } = await parseRequestData(req);
    const action = String(data.action || "create");

    if (action === "delete") {
      const res = await deleteSaleRecord(data);
      return respondResult(req, res, isJson, "/sales");
    }

    const res = await createSaleRecord(data as unknown as SaleInput);
    return respondResult(req, res, isJson, "/sales");
  } catch (err) {
    console.error("POST /api/sales error:", err);
    return Response.json({ ok: false, error: "Problem saving sale" }, { status: 500 });
  }
}
