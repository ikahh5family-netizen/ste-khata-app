import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { expenses } from "@/db/schema";
import { desc } from "drizzle-orm";
import { parseRequestData, respondResult } from "@/lib/api-body";
import { addExpenseRecord, deleteExpenseRecord } from "@/lib/shop-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const list = await db.select().from(expenses).orderBy(desc(expenses.createdAt)).limit(100);
    return Response.json({ ok: true, expenses: list });
  } catch (err) {
    console.error("GET /api/expenses error:", err);
    return Response.json({ ok: false, error: "Could not load expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data, isJson } = await parseRequestData(req);
    const action = String(data.action || "add");

    if (action === "delete") {
      const res = await deleteExpenseRecord(data);
      return respondResult(req, res, isJson, "/expenses");
    }
    const res = await addExpenseRecord(data);
    return respondResult(req, res, isJson, "/expenses");
  } catch (err) {
    console.error("POST /api/expenses error:", err);
    return Response.json({ ok: false, error: "Problem saving expense" }, { status: 500 });
  }
}
