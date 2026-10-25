import { deliverJobRecord } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseInt((await params).id, 10);
    const body = await req.json();
    await deliverJobRecord(id, Number(body.receive ?? 0), body.total === undefined ? undefined : Number(body.total));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Deliver nahi ho saka" }, { status: 400 });
  }
}
