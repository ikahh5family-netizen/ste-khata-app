import { parseRequestData, respondResult } from "@/lib/api-body";
import { seedDemoData } from "@/lib/shop-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { isJson } = await parseRequestData(req);
    const res = await seedDemoData();
    return respondResult(req, res, isJson, "/");
  } catch (err) {
    console.error("POST /api/seed error:", err);
    return Response.json({ ok: false, error: "Problem loading demo data" }, { status: 500 });
  }
}
