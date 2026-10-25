import { addJobPaymentRecord } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseInt((await params).id, 10);
    const { amount } = await req.json();
    await addJobPaymentRecord(id, Number(amount));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Save Payment nahi ho saka" }, { status: 400 });
  }
}
