import { parseEntry, type AiProvider } from "@/lib/ai";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { customers } from "@/db/schema";
import { ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const { text, provider } = (await req.json()) as { text?: string; provider?: string };
    const t = String(text ?? "").slice(0, 1000).trim();
    if (!t) return Response.json({ error: "Please type something" }, { status: 400 });
    const selectedProvider: AiProvider = provider === "mistral-large-4" || provider === "openai" ? provider : "built-in";
    const parsed = await parseEntry(t, selectedProvider);
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
