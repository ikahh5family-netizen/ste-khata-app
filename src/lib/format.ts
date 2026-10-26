export function rs(n: number | null | undefined) {
  const v = Math.round(Number(n ?? 0));
  return "Rs " + v.toLocaleString("en-PK");
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

/** Full date + time including the year — used on printed invoices/receipts. */
export function fmtDateTimeFull(d: Date | string | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

export function jobNo(id: number) {
  return "JOB-" + String(id).padStart(4, "0");
}

export function invNo(id: number) {
  return "INV-" + String(id).padStart(4, "0");
}

export function toInt(v: unknown, def = 0) {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : def;
  const cleaned = String(v ?? "").replace(/,/g, "").trim();
  if (!cleaned) return def;
  const f = parseFloat(cleaned.replace(/[^\d.-]/g, ""));
  return Number.isFinite(f) ? Math.round(f) : def;
}

export function str(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Pakistan time (PKT, UTC+5) based start of day / ranges */
const PK_OFFSET = 5 * 60 * 60 * 1000;

export function startOfDayPK(d = new Date()) {
  const ist = new Date(d.getTime() + PK_OFFSET);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - PK_OFFSET);
}

export function daysAgoPK(n: number) {
  const s = startOfDayPK();
  return new Date(s.getTime() - n * 86400000);
}

export function startOfMonthPK(d = new Date()) {
  const ist = new Date(d.getTime() + PK_OFFSET);
  ist.setUTCDate(1);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - PK_OFFSET);
}

export function parseDateInputPK(s: string | undefined, endOfDay = false) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  const start = new Date(d.getTime() - PK_OFFSET);
  return endOfDay ? new Date(start.getTime() + 86400000 - 1) : start;
}

export function dateInputPK(d: Date) {
  const ist = new Date(d.getTime() + PK_OFFSET);
  return ist.toISOString().slice(0, 10);
}

export function waLink(phone: string, text: string) {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0092")) p = p.slice(2);
  else if (p.length === 11 && p.startsWith("0")) p = "92" + p.slice(1);
  else if (p.length === 10 && p.startsWith("3")) p = "92" + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
