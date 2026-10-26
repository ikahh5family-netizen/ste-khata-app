import "server-only";
import {
  getStats,
  getCustomerBalances,
  getLowStock,
  getOldPendingJobs,
  getTopRepairs,
  getTopModels,
  getTopParts,
  getJobStatusCounts,
  getInventoryValue,
  getExpenseBreakdown,
  type Stats,
} from "./queries";
import { rs, startOfDayPK, startOfMonthPK, daysAgoPK, jobNo } from "./format";
import { IPHONE_MODELS, REPAIR_TYPES, EXPENSE_CATEGORIES } from "./constants";

export type AiProvider = "built-in" | "mistral-large-4" | "openai";

export function aiAvailability() {
  return {
    mistral: Boolean(process.env.MISTRAL_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  };
}

export function aiEnabled() {
  return Boolean(process.env.MISTRAL_API_KEY || process.env.OPENAI_API_KEY);
}

async function snapshot() {
  const now = new Date();
  const yStart = daysAgoPK(1);
  const tStart = startOfDayPK();
  const wStart = daysAgoPK(6);
  const mStart = startOfMonthPK();
  const [today, yesterday, week, month, balances, low, old, topRepairs, topModels, topParts, counts, inv, expBreak] = await Promise.all([
    getStats(tStart, now),
    getStats(yStart, new Date(tStart.getTime() - 1)),
    getStats(wStart, now),
    getStats(mStart, now),
    getCustomerBalances(),
    getLowStock(),
    getOldPendingJobs(3),
    getTopRepairs(mStart, now),
    getTopModels(mStart, now),
    getTopParts(mStart, now),
    getJobStatusCounts(),
    getInventoryValue(),
    getExpenseBreakdown(mStart, now),
  ]);
  const debtors = balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance);
  return { today, yesterday, week, month, debtors, low, old, topRepairs, topModels, topParts, counts, inv, expBreak };
}

type Snap = Awaited<ReturnType<typeof snapshot>>;

function statLine(name: string, s: Stats) {
  return `${name}: Total revenue ${rs(s.totalRevenue)} (Repair ${rs(s.repairRevenue)} – ${s.repairCount} jobs, Parts sale ${rs(s.saleRevenue)} – ${s.saleCount} bills). Expenses ${rs(s.expenses)}. Net profit ${rs(s.netProfit)}.`;
}

export async function getQuickInsights(): Promise<string[]> {
  const s = await snapshot();
  const out: string[] = [];
  const diff = s.today.totalRevenue - s.yesterday.totalRevenue;
  out.push(
    s.today.totalRevenue
      ? `Today's revenue ${rs(s.today.totalRevenue)}, ${diff >= 0 ? "📈 " + rs(diff) + " more" : "📉 " + rs(-diff) + " less"} than yesterday.`
      : `No delivery/sale recorded today yet. Yesterday's revenue was ${rs(s.yesterday.totalRevenue)}.`
  );
  if (s.counts.ready) out.push(`📲 ${s.counts.ready} phone(s) ready — WhatsApp the customers to collect.`);
  if (s.debtors.length) out.push(`💰 ${s.debtors.length} customer(s) owe ${rs(s.debtors.reduce((a, d) => a + d.balance, 0))}. Highest: ${s.debtors[0].name} (${rs(s.debtors[0].balance)}).`);
  if (s.low.length) out.push(`📦 ${s.low.length} part(s) low in stock: ${s.low.slice(0, 2).map((p) => p.name).join(", ")}.`);
  if (s.topRepairs[0]) out.push(`🏆 Top earner this month: ${s.topRepairs[0].repair_type} (${rs(s.topRepairs[0].t)}).`);
  if (s.old.length) out.push(`⏰ ${s.old.length} job(s) pending for more than 3 days.`);
  return out.slice(0, 4);
}

function contextText(s: Snap) {
  return [
    statLine("Today", s.today),
    statLine("Yesterday", s.yesterday),
    statLine("Last 7 days", s.week),
    statLine("This month", s.month),
    `Job status counts: ${JSON.stringify(s.counts)}`,
    `Credit due (top): ${s.debtors.slice(0, 10).map((d) => `${d.name} ${d.phone} ${rs(d.balance)}`).join("; ") || "none"}`,
    `Low stock: ${s.low.map((p) => `${p.name} (${p.stock})`).join("; ") || "none"}`,
    `Old pending jobs: ${s.old.map((j) => `${jobNo(j.id)} ${j.customer_name} ${j.device_model} ${j.repair_type} [${j.status}]`).join("; ") || "none"}`,
    `Top repairs (month): ${s.topRepairs.map((r) => `${r.repair_type}: ${r.c} jobs, ${rs(r.t)}, profit ${rs(r.profit)}`).join("; ") || "-"}`,
    `Top models (month): ${s.topModels.map((m) => `${m.device_model}: ${m.c}`).join("; ") || "-"}`,
    `Top parts sold (month): ${s.topParts.map((p) => `${p.name}: ${p.q} pcs, ${rs(p.t)}, profit ${rs(p.profit)}`).join("; ") || "-"}`,
    `Expense breakdown (month): ${s.expBreak.map((e) => `${e.category} ${rs(e.t)}`).join("; ") || "-"}`,
    `Stock value: cost ${rs(s.inv.cost)}, selling value ${rs(s.inv.sale)}, ${s.inv.items} items`,
  ].join("\n");
}

async function callModel(messages: { role: string; content: string }[], json: boolean, provider: AiProvider): Promise<string | null> {
  // The browser sends only the provider ID; credentials never leave this server.
  const mistral = provider === "mistral-large-4";
  const key = mistral ? process.env.MISTRAL_API_KEY : provider === "openai" ? process.env.OPENAI_API_KEY : undefined;
  if (!key) return null;
  const endpoint = mistral
    ? "https://api.mistral.ai/v1/chat/completions"
    : `${(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: mistral ? "mistral-large-4" : process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        temperature: 0.3,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) {
      console.warn(`${provider} AI request failed with status ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string | { type?: string; text?: string }[] } }[] };
    const content = data.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : Array.isArray(content) ? content.map((part) => part.text ?? "").join("") || null : null;
  } catch (err) {
    console.warn(`${provider} AI request unavailable:`, err instanceof Error ? err.name : "error");
    return null;
  }
}

export async function answerQuestion(
  question: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  provider: AiProvider = "built-in"
) {
  const s = await snapshot();
  if (provider !== "built-in") {
    const reply = await callModel([
      {
        role: "system",
        content:
          "You are an AI business assistant for an iPhone/mobile repair shop in Pakistan. Reply to the shop owner in short, clear English with bullet points. Currency is Pakistani Rupees (Rs), write amounts like 'Rs 25,000'. Base your facts only on the data below, and give practical business tips (pricing, stock, credit collection, marketing).\n\nSHOP DATA:\n" +
          contextText(s),
      },
      ...history.slice(-8),
      { role: "user", content: question },
    ], false, provider);
    if (reply) return reply;
  }
  return ruleAnswer(question, s, provider !== "built-in");
}

function has(q: string, words: string[]) {
  return words.some((w) => q.includes(w));
}

function ruleAnswer(question: string, s: Snap, modelUnavailable = false): string {
  const q = question.toLowerCase();
  const parts: string[] = [];

  if (has(q, ["due", "dues", "credit", "owe", "owes", "receivable", "pending payment", "khata", "udhaar", "udhar", "baki", "baaki", "lena"])) {
    if (!s.debtors.length) parts.push("✅ No customer has any due balance.");
    else {
      const total = s.debtors.reduce((a, d) => a + d.balance, 0);
      parts.push(`💰 **Total credit due: ${rs(total)}** (${s.debtors.length} customers)`);
      parts.push(s.debtors.slice(0, 8).map((d) => `• ${d.name}${d.phone ? " (" + d.phone + ")" : ""} — ${rs(d.balance)}`).join("\n"));
      parts.push("Tip: You can send a WhatsApp reminder directly from the Khata page.");
    }
  }
  if (has(q, ["stock", "inventory", "low", "running out", "order", "parts left", "khatam", "maal"])) {
    if (!s.low.length) parts.push("📦 All parts are in healthy stock.");
    else parts.push(`📦 **Low-stock parts (order these):**\n${s.low.map((p) => `• ${p.name} — only ${p.stock} left (min ${p.min_stock})`).join("\n")}`);
    parts.push(`Total stock value: cost ${rs(s.inv.cost)}, selling value ${rs(s.inv.sale)}.`);
  }
  if (has(q, ["pending", "ready", "job", "jobs", "phone", "deliver", "repair status", "kaam"])) {
    const c = s.counts;
    parts.push(`🔧 **Jobs:** Received ${c.received ?? 0}, In Progress ${c.in_progress ?? 0}, Waiting Part ${c.waiting_part ?? 0}, Ready ${c.ready ?? 0}, Delivered ${c.delivered ?? 0}.`);
    if (s.old.length) parts.push(`⏰ Pending for 3+ days:\n${s.old.map((j) => `• ${jobNo(j.id)} ${j.customer_name} – ${j.device_model} (${j.repair_type})`).join("\n")}`);
  }
  if (has(q, ["best", "top", "most", "popular", "model", "which", "selling"])) {
    if (s.topRepairs.length) parts.push(`🏆 **Top repairs (this month):**\n${s.topRepairs.slice(0, 5).map((r) => `• ${r.repair_type}: ${r.c} jobs, ${rs(r.t)} (profit ${rs(r.profit)})`).join("\n")}`);
    if (s.topModels.length) parts.push(`📱 **Most received models:** ${s.topModels.slice(0, 5).map((m) => `${m.device_model} (${m.c})`).join(", ")}`);
    if (s.topParts.length) parts.push(`🛒 **Top selling parts:** ${s.topParts.slice(0, 5).map((p) => `${p.name} (${p.q} pcs)`).join(", ")}`);
  }
  if (has(q, ["expense", "expenses", "spending", "kharcha", "kharch"])) {
    parts.push(`💸 **This month's expenses: ${rs(s.month.expenses)}**\n${s.expBreak.map((e) => `• ${e.category}: ${rs(e.t)}`).join("\n") || "No expenses."}`);
  }
  const wantsWeek = has(q, ["week", "7 days", "hafta"]);
  const wantsMonth = has(q, ["month", "monthly", "mahina", "mahine"]);
  const wantsYesterday = has(q, ["yesterday", "kal"]);
  const wantsSales = has(q, ["sale", "sales", "earn", "earned", "income", "revenue", "profit", "loss", "today", "summary", "report", "how much", "kitna", "kamai", "munafa"]);
  if (wantsSales || wantsWeek || wantsMonth || wantsYesterday || parts.length === 0) {
    if (wantsYesterday) parts.push("📅 " + statLine("Yesterday", s.yesterday));
    if (wantsWeek) parts.push("📅 " + statLine("Last 7 days", s.week));
    if (wantsMonth) parts.push("📅 " + statLine("This month", s.month));
    if (!wantsYesterday && !wantsWeek && !wantsMonth) {
      parts.push("📅 " + statLine("Today", s.today));
      parts.push("📅 " + statLine("This month", s.month));
    }
    const m = s.month;
    if (m.totalRevenue > 0) {
      const repairMargin = m.repairRevenue ? Math.round(((m.repairRevenue - m.repairPartsCost) / m.repairRevenue) * 100) : 0;
      const saleMargin = m.saleRevenue ? Math.round(((m.saleRevenue - m.saleCost) / m.saleRevenue) * 100) : 0;
      parts.push(`📊 Margin: Repair ${repairMargin}% · Parts sale ${saleMargin}%.`);
      const tips: string[] = [];
      if (saleMargin && saleMargin < 30) tips.push("Parts/accessory margin is low — bundle high-margin items like tempered glass, covers and cables with every repair.");
      if (repairMargin > 50) tips.push("Repair margin is great — post before/after photos on your Google Business profile and WhatsApp status.");
      if (s.debtors.length > 3) tips.push("Many customers have dues — take full payment at delivery time as a policy.");
      if (s.counts.ready) tips.push(`${s.counts.ready} ready phone(s) — call/WhatsApp those customers today.`);
      if (tips.length) parts.push("💡 **Suggestions:**\n" + tips.map((t) => "• " + t).join("\n"));
    }
  }
  parts.push(modelUnavailable ? "_(Built-in response: the selected AI provider was unavailable.)_" : "_(Built-in shop insights.)_");
  return parts.join("\n\n");
}

/* ------------ Quick entry parser ------------ */

export type ParsedEntry =
  | {
      type: "job";
      customerName: string;
      phone: string;
      deviceModel: string;
      repairType: string;
      total: number;
      paid: number;
      imei: string;
      issue: string;
    }
  | { type: "expense"; category: string; amount: number; note: string }
  | { type: "payment"; customerName: string; amount: number }
  | { type: "unknown"; message: string };

const REPAIR_KEYWORDS: [string[], string][] = [
  [["screen", "display", "touch", "lcd", "oled", "folder", "combo", "glass toota", "screen toot"], "Screen / Display"],
  [["battery", "betri", "backup", "battery health"], "Battery"],
  [["charging", "charge", "port", "jack"], "Charging Port"],
  [["back glass", "backglass", "back panel", "piche ka glass"], "Back Glass"],
  [["front camera", "selfie"], "Front Camera"],
  [["camera glass", "lens"], "Camera Glass"],
  [["camera"], "Rear Camera"],
  [["face id", "faceid"], "Face ID"],
  [["touch id", "home button"], "Touch ID / Home Button"],
  [["speaker", "awaaz", "sound", "ear"], "Speaker / Ear Speaker"],
  [["mic", "microphone"], "Microphone"],
  [["water", "paani", "pani"], "Water Damage"],
  [["ic", "motherboard", "board", "dead", "short", "restart", "logo"], "Motherboard / IC"],
  [["network", "signal", "baseband", "no service"], "Network / Baseband"],
  [["housing", "body", "frame"], "Housing / Body"],
  [["button", "volume", "power key"], "Power / Volume Button"],
  [["software", "icloud", "update", "unlock", "flash", "restore"], "Software / iCloud / Update"],
];

function detectModel(t: string) {
  const m = t.match(/(?:iphone|i\s?phone|ip)\s*(\d{1,2}e?|x[rs]?|se)\s*(pro\s*max|pro|plus|mini|max|air)?/i);
  if (!m) return "";
  let num = m[1].toUpperCase();
  if (num === "X" || num === "XR" || num === "XS") num = num.toUpperCase();
  const suffix = (m[2] || "").toLowerCase().replace(/\s+/g, " ");
  const pretty = suffix ? " " + suffix.replace("pro max", "Pro Max").replace("pro", "Pro").replace("plus", "Plus").replace("max", "Max").replace("air", "Air") : "";
  const guess = `iPhone ${num.replace("E", "e")}${pretty}`.replace("iPhone SE", "iPhone SE (3rd gen)");
  const exact = IPHONE_MODELS.find((x) => x.toLowerCase() === guess.toLowerCase());
  return exact || guess;
}

function ruleParse(text: string): ParsedEntry {
  const t = text.toLowerCase();
  const phoneM = text.match(/(?<!\d)(?:\+92|0092|92|0)?[\s-]?(3\d{2})[\s-]?(\d{7})(?!\d)/);
  const phone = phoneM ? "0" + phoneM[1] + phoneM[2] : "";
  const noPhone = phone ? text.replace(phoneM![0], " ") : text;
  const model = detectModel(noPhone);
  const noModel = noPhone.replace(/(?:iphone|i\s?phone|ip)\s*(\d{1,2}e?|x[rs]?|se)\s*(pro\s*max|pro|plus|mini|max|air)?/i, " ");

  const advM = noModel.match(/(?:advance|adv|jama|diye|paid|liye|deposit)\s*(?:rs\.?|Rs)?\s*(\d+)/i) || noModel.match(/(\d+)\s*(?:advance|adv|jama|deposit)/i);
  const advance = advM ? parseInt(advM[1], 10) : 0;
  const rest = advM ? noModel.replace(advM[0], " ") : noModel;
  const nums = [...rest.matchAll(/(?:rs\.?|Rs|pkr)?\s*(\d{2,6})/gi)].map((x) => parseInt(x[1], 10));
  const amount = nums.length ? Math.max(...nums) : 0;

  // Expense
  if (has(t, ["expense", "expenses", "spent", "spending", "kharcha", "kharch", "rent", "salary", "bijli", "electricity", "chai", "tea", "petrol", "gas"]) && !model) {
    const cat =
      EXPENSE_CATEGORIES.find((c) => t.includes(c.toLowerCase().split(" ")[0].replace(/[()]/g, ""))) ||
      (has(t, ["chai", "tea", "khana", "nashta", "food"]) ? "Tea / Food" : has(t, ["petrol", "auto", "bus", "transport", "fare"]) ? "Transport" : "Other");
    return { type: "expense", category: cat, amount, note: text.trim() };
  }
  // Payment received (customer cleared old dues)
  if (
    !model &&
    (/\bne\b.*\b(diye|di|bheje|jama)\b/.test(t) ||
      has(t, ["payment", "paid", "gave", "received", "cleared", "settled", "jama kiye", "wapas", "mile", "chukaya"]))
  ) {
    const name = text
      .replace(/\d+/g, "")
      .replace(/\b(ne|diye|di|bheje|payment|paid|gave|received|cleared|settled|jama|kiye|rs|mile|wapas|chukaya|upi|cash|jazzcash|easypaisa|sahab|bhai|ne|ka|ki)\b/gi, "")
      .trim();
    return { type: "payment", customerName: name, amount: amount || advance };
  }
  if (!model) {
    return {
      type: "unknown",
      message: "Could not detect the phone model. Example: \"iPhone 13 screen 25000 Ahmed 03001234567 advance 5000\" or \"expense tea 300\"",
    };
  }
  let repairType = "Other";
  for (const [keys, type] of REPAIR_KEYWORDS) {
    if (keys.some((k) => new RegExp(`\\b${k}`, "i").test(rest))) {
      repairType = type;
      break;
    }
  }
  const stop = new Set([
    "screen", "display", "battery", "change", "replace", "badalna", "lagana", "charging", "port", "back", "glass", "camera", "face", "id",
    "speaker", "mic", "water", "damage", "advance", "adv", "rs", "pkr", "jama", "ka", "ki", "ke", "hai", "aur", "and", "repair", "new", "naya", "job",
    "touch", "issue", "problem", "nahi", "chal", "raha", "ho", "gaya", "toota", "tuta", "broken", "dead", "board", "ic", "for", "customer", "naam",
    "phone", "mobile", "original", "copy", "oled", "lcd", "body", "housing", "software", "update", "restart", "network", "button", "paid", "diye",
    "deposit", "fixed", "fix",
  ]);
  const words = rest
    .replace(/[\d.,:;+-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w.toLowerCase()) && w.length > 1);
  const name = words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  const imeiM = text.match(/\b(\d{15})\b/);
  return {
    type: "job",
    customerName: name,
    phone,
    deviceModel: model,
    repairType,
    total: amount,
    paid: advance,
    imei: imeiM ? imeiM[1] : "",
    issue: text.trim(),
  };
}

export async function parseEntry(text: string, provider: AiProvider = "built-in"): Promise<ParsedEntry> {
  if (provider !== "built-in") {
    const out = await callModel(
      [
        {
          role: "system",
          content: `Convert the shop owner's plain English message into one record entry. Reply with JSON only.
Types:
1) {"type":"job","customerName":"","phone":"","deviceModel":"one of: ${IPHONE_MODELS.join(", ")}","repairType":"one of: ${REPAIR_TYPES.join(", ")}","total":0,"paid":0,"imei":"","issue":""}
2) {"type":"expense","category":"one of: ${EXPENSE_CATEGORIES.join(", ")}","amount":0,"note":""}
3) {"type":"payment","customerName":"","amount":0}  (customer paid back old credit)
4) {"type":"unknown","message":"reason in English"}
"paid" = advance received right now. Numbers as integers.`,
        },
        { role: "user", content: text },
      ],
      true,
      provider
    );
    if (out) {
      try {
        const j = JSON.parse(out) as ParsedEntry;
        if (j && typeof j === "object" && "type" in j) return j;
      } catch {
        /* fall through */
      }
    }
  }
  return ruleParse(text);
}
