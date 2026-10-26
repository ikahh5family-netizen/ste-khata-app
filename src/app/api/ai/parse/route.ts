import { parseEntry } from "@/lib/ai";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { customers } from "@/db/schema";
import { ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const { text } = (await req.json()) as { text?: string };
    const t = String(text ?? "").slice(0, 1000).trim();
    if (!t) return Response.json({ error: "Please type something" }, { status: 400 });
    const parsed = await parseEntry(t);
    let matches: { id: number; name: string; phone: string }[] = [];
    if (parsed.type === "payment" && parsed.customerName) {
      const first = parsed.customerName.split(/\s+/)[0];
      matches = await db
        .select({ id: customers.id, name: customers.name, phone: customers.phone })
        .from(customers)
        .where(ilike(customers.name, `%${first}%`))
        .limit(5);
    }
    return Response.json({ parsed, matches });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not understand" }, { status: 500 });
  }
}
