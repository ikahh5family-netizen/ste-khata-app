import { saveCustomerRecord } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const id = await saveCustomerRecord(undefined, await req.json());
    return Response.json({ ok: true, id });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Customer could not be saved" }, { status: 400 });
  }
}
