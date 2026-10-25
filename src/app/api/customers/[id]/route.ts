import { saveCustomerRecord } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseInt((await params).id, 10);
    await saveCustomerRecord(id, await req.json());
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Save nahi ho saka" }, { status: 400 });
  }
}
