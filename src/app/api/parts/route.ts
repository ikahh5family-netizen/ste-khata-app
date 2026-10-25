import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { parts } from "@/db/schema";
import { asc } from "drizzle-orm";
import { parseRequestData, respondResult } from "@/lib/api-body";
import { savePartRecord, deletePartRecord, stockInRecord } from "@/lib/shop-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const list = await db.select().from(parts).orderBy(asc(parts.category), asc(parts.name));
    return Response.json({ ok: true, parts: list });
  } catch (err) {
    console.error("GET /api/parts error:", err);
    return Response.json({ ok: false, error: "Could not load stock" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data, isJson } = await parseRequestData(req);
    const action = String(data.action || "save");

    if (action === "delete") {
      const res = await deletePartRecord(data);
      return respondResult(req, res, isJson, "/inventory");
    }
    if (action === "stockIn") {
      const res = await stockInRecord(data);
      return respondResult(req, res, isJson, "/inventory");
    }
    const res = await savePartRecord(data);
    return respondResult(req, res, isJson, "/inventory");
  } catch (err) {
    console.error("POST /api/parts error:", err);
    return Response.json({ ok: false, error: "Problem saving stock" }, { status: 500 });
  }
}
