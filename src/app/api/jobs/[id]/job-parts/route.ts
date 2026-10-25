import { addJobPartRecord } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jobId = parseInt((await params).id, 10);
    await addJobPartRecord(jobId, await req.json());
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Part add nahi ho saka" }, { status: 400 });
  }
}
