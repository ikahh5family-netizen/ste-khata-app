import { answerQuestion } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string; history?: { role: "user" | "assistant"; content: string }[] };
    const message = String(body.message ?? "").slice(0, 2000).trim();
    if (!message) return Response.json({ error: "Message is empty" }, { status: 400 });
    const history = Array.isArray(body.history)
      ? body.history.filter((h) => h && (h.role === "user" || h.role === "assistant")).map((h) => ({ role: h.role, content: String(h.content).slice(0, 2000) }))
      : [];
    const reply = await answerQuestion(message, history);
    return Response.json({ reply });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "AI error, please try again" }, { status: 500 });
  }
}
