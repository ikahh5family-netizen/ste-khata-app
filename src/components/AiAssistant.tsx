"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };
type AiProvider = "built-in" | "mistral-large-4" | "openai";
type Availability = { mistral: boolean; openai: boolean };
type Parsed =
  | { type: "job"; customerName: string; phone: string; deviceModel: string; repairType: string; total: number; paid: number; imei: string; issue: string }
  | { type: "expense"; category: string; amount: number; note: string }
  | { type: "payment"; customerName: string; amount: number }
  | { type: "unknown"; message: string };

const SUGGESTIONS = [
  "How much did I earn today?",
  "Who owes me money?",
  "Which stock is running low?",
  "This month's profit and top repair?",
  "Show pending and ready jobs",
  "This week's summary",
];

const EXAMPLES = [
  "iPhone 13 screen change 25000 Ahmed 03001234567 advance 5000",
  "iphone 11 battery 6500 Usman",
  "expense tea 300",
  "Ahmed paid 5000",
];

function render(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) return <b key={j}>{p.slice(2, -2)}</b>;
      if (p.startsWith("_") && p.endsWith("_") && p.length > 2) return <i key={j} className="text-slate-400">{p.slice(1, -1)}</i>;
      return <span key={j}>{p}</span>;
    });
    return (
      <div key={i} className={line.trim() === "" ? "h-2" : ""}>
        {parts}
      </div>
    );
  });
}

type SR = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function useVoice(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const ref = useRef<SR | null>(null);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  function toggle() {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) return;
    if (listening) {
      ref.current?.stop();
      return;
    }
    const r = new C();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e) => onText(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    ref.current = r;
    r.start();
    setListening(true);
  }
  return { listening, toggle, supported };
}

export function AiAssistant({ availability }: { availability: Availability }) {
  const [tab, setTab] = useState<"chat" | "entry">("chat");
  const [provider, setProvider] = useState<AiProvider>(availability.mistral ? "mistral-large-4" : availability.openai ? "openai" : "built-in");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-3 sm:p-4">
        <label htmlFor="ai-provider" className="text-sm font-semibold text-slate-800">AI model</label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as AiProvider)}
          className="input max-w-xs border-orange-200 font-medium focus:border-orange-500 focus:ring-orange-100"
        >
          <option value="built-in">Built-in insights · free</option>
          <option value="mistral-large-4" disabled={!availability.mistral}>Mistral Large 4{availability.mistral ? " · ready" : " · API key needed"}</option>
          <option value="openai" disabled={!availability.openai}>OpenAI{availability.openai ? " · ready" : " · API key needed"}</option>
        </select>
        <p className="text-xs leading-relaxed text-slate-600">
          {provider === "mistral-large-4"
            ? "Mistral Large 4 is selected. If its API is unavailable, the built-in assistant answers instead."
            : availability.mistral
              ? "Choose Mistral Large 4 for advanced answers. API credentials stay on the server."
              : "To enable Mistral Large 4, add MISTRAL_API_KEY to your server environment. The built-in assistant works without a key."}
        </p>
      </div>
      <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button onClick={() => setTab("chat")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "chat" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>
          💬 Ask Questions
        </button>
        <button onClick={() => setTab("entry")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "entry" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>
          ⚡ Type/Speak Entry
        </button>
      </div>
      {tab === "chat" ? <Chat provider={provider} /> : <QuickEntry provider={provider} />}
    </div>
  );
}

function Chat({ provider }: { provider: AiProvider }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hello! 🙏 I'm your shop's AI assistant. Ask me about today's earnings, dues, stock, top repairs and profit.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const voice = useVoice((t) => setInput(t));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text?: string) {
    const m = (text ?? input).trim();
    if (!m || loading) return;
    setInput("");
    const history = msgs.slice(1);
    setMsgs((p) => [...p, { role: "user", content: m }]);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m, history, provider }),
      });
      const d = (await r.json()) as { reply?: string; error?: string };
      setMsgs((p) => [...p, { role: "assistant", content: d.reply ?? d.error ?? "Error" }]);
    } catch {
      setMsgs((p) => [...p, { role: "assistant", content: "Network error, please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex h-[calc(100vh-260px)] min-h-[420px] flex-col p-0">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
              {render(m.content)}
            </div>
          </div>
        ))}
        {loading && <div className="w-fit animate-pulse rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} className="input" placeholder="Ask… e.g. 'how much profit today?'" />
          {voice.supported && (
            <button type="button" onClick={voice.toggle} className={`btn shrink-0 ${voice.listening ? "bg-rose-500 text-white" : "btn-light"}`} title="Ask by voice">
              {voice.listening ? "⏹" : "🎤"}
            </button>
          )}
          <button disabled={loading} className="btn-primary shrink-0">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function QuickEntry({ provider }: { provider: AiProvider }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [matches, setMatches] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");
  const voice = useVoice((t) => setText(t));

  async function parse(t?: string) {
    const v = (t ?? text).trim();
    if (!v) return;
    setLoading(true);
    setDone("");
    setErr("");
    setParsed(null);
    try {
      const r = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: v, provider }),
      });
      const d = (await r.json()) as { parsed?: Parsed; matches?: { id: number; name: string; phone: string }[]; error?: string };
      setParsed(d.parsed ?? { type: "unknown", message: d.error ?? "Error" });
      setMatches(d.matches ?? []);
    } finally {
      setLoading(false);
    }
  }

  function openJob(p: Extract<Parsed, { type: "job" }>) {
    const qs = new URLSearchParams({
      customerName: p.customerName || "",
      phone: p.phone || "",
      deviceModel: p.deviceModel || "",
      repairType: p.repairType || "",
      total: String(p.total || ""),
      paid: String(p.paid || ""),
      imei: p.imei || "",
      issue: p.issue || "",
    });
    router.push(`/jobs/new?${qs.toString()}`);
  }

  async function saveJobDirectly(p: Extract<Parsed, { type: "job" }>) {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          customerName: p.customerName || "Customer",
          phone: p.phone || "",
          deviceModel: p.deviceModel,
          repairType: p.repairType,
          total: p.total || 0,
          paid: p.paid || 0,
          imei: p.imei || "",
          issue: p.issue || "",
          warrantyDays: 30,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; redirectTo?: string; error?: string };
      if (!res.ok || !d.ok) {
        setErr(d.error || "Job could not be saved");
        return;
      }
      router.push(d.redirectTo || "/jobs");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveExpense(p: Extract<Parsed, { type: "expense" }>) {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", category: p.category, amount: p.amount, note: p.note }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        setErr(d.error || "Expense could not be saved");
        return;
      }
      setDone(`✅ Expense Rs ${p.amount.toLocaleString("en-PK")} (${p.category}) saved.`);
      setParsed(null);
      setText("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function savePayment(customerId: number, amount: number, name: string) {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addPayment", customerId, amount, note: "AI entry" }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        setErr(d.error || "Payment could not be saved");
        return;
      }
      setDone(`✅ Rs ${amount.toLocaleString("en-PK")} payment from ${name} added to khata.`);
      setParsed(null);
      setText("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3">
        <h2 className="font-semibold">⚡ Type or speak in plain English</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="input"
          placeholder="iPhone 13 screen change 25000 Ahmed 03001234567 advance 5000"
        />
        <div className="flex gap-2">
          <button onClick={() => parse()} disabled={loading} className="btn-primary flex-1">
            {loading ? "Understanding…" : "✨ Understand with AI"}
          </button>
          {voice.supported && (
            <button type="button" onClick={voice.toggle} className={`btn ${voice.listening ? "bg-rose-500 text-white" : "btn-light"}`}>
              {voice.listening ? "⏹ Stop" : "🎤 Speak"}
            </button>
          )}
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">Examples (click):</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setText(e);
                  parse(e);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-indigo-50"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Result</h2>
        {done && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{done}</div>}
        {err && <div className="mb-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">⚠️ {err}</div>}
        {!parsed && !done && (
          <p className="text-sm text-slate-500">Type an entry and press &quot;Understand with AI&quot;. AI recognizes repair jobs, expenses and credit payments.</p>
        )}
        {parsed?.type === "unknown" && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{parsed.message}</div>}
        {parsed?.type === "job" && (
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-indigo-600">🔧 New Repair Job</div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <KV k="Customer" v={parsed.customerName} />
              <KV k="Phone" v={parsed.phone} />
              <KV k="Model" v={parsed.deviceModel} />
              <KV k="Repair" v={parsed.repairType} />
              <KV k="Total" v={parsed.total ? `Rs ${parsed.total.toLocaleString("en-PK")}` : ""} />
              <KV k="Advance" v={parsed.paid ? `Rs ${parsed.paid.toLocaleString("en-PK")}` : ""} />
            </dl>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button disabled={saving} onClick={() => saveJobDirectly(parsed)} className="btn-green flex-1">
                {saving ? "Saving..." : "✅ Save Job Directly"}
              </button>
              <button disabled={saving} onClick={() => openJob(parsed)} className="btn-light flex-1">
                Edit in Form →
              </button>
            </div>
          </div>
        )}
        {parsed?.type === "expense" && (
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-rose-600">💸 Expense</div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <KV k="Category" v={parsed.category} />
              <KV k="Amount" v={`Rs ${parsed.amount.toLocaleString("en-PK")}`} />
            </dl>
            <button disabled={!parsed.amount || saving} onClick={() => saveExpense(parsed)} className="btn-primary w-full">
              {saving ? "Saving..." : "✅ Save Expense"}
            </button>
          </div>
        )}
        {parsed?.type === "payment" && (
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-emerald-600">💵 Credit payment received — Rs {parsed.amount.toLocaleString("en-PK")}</div>
            {matches.length === 0 ? (
              <p className="text-sm text-slate-500">&quot;{parsed.customerName}&quot; was not found in khata.</p>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">Select customer:</div>
                {matches.map((m) => (
                  <button
                    key={m.id}
                    disabled={!parsed.amount || saving}
                    onClick={() => savePayment(m.id, parsed.amount, m.name)}
                    className="btn-light w-full justify-between"
                  >
                    <span>
                      {m.name} <span className="text-xs text-slate-400">{m.phone}</span>
                    </span>
                    <span>Record Rs {parsed.amount.toLocaleString("en-PK")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{k}</dt>
      <dd className="font-medium">{v || <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}
