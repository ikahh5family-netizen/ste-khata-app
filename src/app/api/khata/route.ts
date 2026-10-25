import { getCustomerBalances } from "@/lib/queries";
import { parseRequestData, respondResult } from "@/lib/api-body";
import { saveCustomerRecord, addPaymentRecord, deletePaymentRecord } from "@/lib/shop-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const customers = await getCustomerBalances();
    return Response.json({ ok: true, customers });
  } catch (err) {
    console.error("GET /api/khata error:", err);
    return Response.json({ ok: false, error: "Could not load khata" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data, isJson } = await parseRequestData(req);
    const action = String(data.action || "saveCustomer");

    if (action === "addPayment") {
      const res = await addPaymentRecord(data);
      return respondResult(req, res, isJson, "/khata");
    }
    if (action === "deletePayment") {
      const res = await deletePaymentRecord(data);
      return respondResult(req, res, isJson, "/khata");
    }
    const res = await saveCustomerRecord(data);
    return respondResult(req, res, isJson, "/khata");
  } catch (err) {
    console.error("POST /api/khata error:", err);
    return Response.json({ ok: false, error: "Problem saving khata" }, { status: 500 });
  }
}
