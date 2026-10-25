import { addPaymentRecord } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const customerId = parseInt((await params).id, 10);
    const body = await req.json();
    await addPaymentRecord(customerId, Number(body.amount), String(body.mode ?? "cash"), String(body.note ?? ""));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Save Payment nahi ho saka" }, { status: 400 });
  }
}
