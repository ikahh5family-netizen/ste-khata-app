import { removeJobPartRecord } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await removeJobPartRecord(parseInt((await params).id, 10));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Hata nahi saka" }, { status: 400 });
  }
}
