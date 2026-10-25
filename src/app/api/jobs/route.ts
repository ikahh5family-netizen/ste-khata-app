import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { parseRequestData, respondResult } from "@/lib/api-body";
import {
  createJobRecord,
  updateJobRecord,
  setJobStatusRecord,
  deliverJobRecord,
  addJobPaymentRecord,
  addJobPartRecord,
  removeJobPartRecord,
  deleteJobRecord,
} from "@/lib/shop-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const list = await db.select().from(repairJobs).orderBy(desc(repairJobs.receivedAt)).limit(200);
    return Response.json({ ok: true, jobs: list });
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return Response.json({ ok: false, error: "Could not load jobs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data, isJson } = await parseRequestData(req);
    const action = String(data.action || (data.id ? "update" : "create"));

    let res;
    switch (action) {
      case "update":
        res = await updateJobRecord(data);
        break;
      case "status":
        res = await setJobStatusRecord(data);
        break;
      case "deliver":
        res = await deliverJobRecord(data);
        break;
      case "payment":
        res = await addJobPaymentRecord(data);
        break;
      case "addPart":
        res = await addJobPartRecord(data);
        break;
      case "removePart":
        res = await removeJobPartRecord(data);
        break;
      case "delete":
        res = await deleteJobRecord(data);
        break;
      case "create":
      default:
        res = await createJobRecord(data);
        break;
    }
    return respondResult(req, res, isJson, "/jobs");
  } catch (err) {
    console.error("POST /api/jobs error:", err);
    return Response.json({ ok: false, error: "Problem saving job" }, { status: 500 });
  }
}
