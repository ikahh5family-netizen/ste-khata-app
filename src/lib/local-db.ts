/* Cached backup snapshot in localStorage. Export and import can read/write the
 * snapshot without a network connection. The application itself still requires
 * its Next.js server and PostgreSQL database to view/edit live records.
 * JSON backups are NOT encrypted; keep them in a private place.
 */

export type BackupData = {
  customers: Record<string, unknown>[];
  parts: Record<string, unknown>[];
  repairJobs: Record<string, unknown>[];
  jobParts: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  saleItems: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
};

export type LocalBackup = {
  app: string;
  version: number;
  exportedAt: string;
  checksum?: string;
  counts: Record<string, number>;
  data: BackupData;
};

export const COLLECTIONS = ["customers", "parts", "repairJobs", "jobParts", "sales", "saleItems", "payments", "expenses", "purchases"] as const;
export type Collection = (typeof COLLECTIONS)[number];

const PREFIX = "ste.local.";
const META_KEY = "ste.local.meta";

function storage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    /* access can throw in some privacy modes */
  }
  return null;
}

function readCollection(c: Collection): Record<string, unknown>[] {
  const s = storage();
  if (!s) return [];
  try {
    const v = JSON.parse(s.getItem(PREFIX + c) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeCollection(c: Collection, rows: Record<string, unknown>[]) {
  const s = storage();
  if (!s) return;
  s.setItem(PREFIX + c, JSON.stringify(rows));
}

export function getCollection(c: Collection): Record<string, unknown>[] {
  return readCollection(c);
}

export function getCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of COLLECTIONS) out[c] = readCollection(c).length;
  return out;
}

export function totalRecords(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
}

type LocalMeta = { lastSyncedAt?: string; lastImportAt?: string; pendingRestore?: boolean };

export function getMeta(): LocalMeta {
  const s = storage();
  if (!s) return {};
  try {
    return JSON.parse(s.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
}

function setMeta(patch: Partial<LocalMeta>) {
  const s = storage();
  if (!s) return;
  s.setItem(META_KEY, JSON.stringify({ ...getMeta(), ...patch }));
}

/** Replace the whole local store with backup data (used by Import & hydration). */
export function replaceAll(data: BackupData) {
  for (const c of COLLECTIONS) writeCollection(c, Array.isArray(data[c]) ? data[c] : []);
}

/** Mark that a restore/import happened (shown on the dashboard card). */
export function markImported() {
  setMeta({ lastImportAt: new Date().toISOString(), pendingRestore: true });
}

/** SHA-256 of a string (Web Crypto). Returns null when unavailable (non-secure context). */
export async function sha256Text(text: string): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/** Build a backup file object from the local store (adds integrity checksum when possible). */
export async function buildBackup(): Promise<LocalBackup> {
  const data = {} as BackupData;
  for (const c of COLLECTIONS) data[c] = readCollection(c);
  const counts = getCounts();
  const base: LocalBackup = {
    app: "STE Mobile Care",
    version: 2,
    exportedAt: new Date().toISOString(),
    counts,
    data,
  };
  const checksum = await sha256Text(JSON.stringify(data));
  return checksum ? { ...base, checksum } : base;
}

/** Verify the integrity checksum embedded in a backup file. */
export async function verifyBackupChecksum(backup: LocalBackup): Promise<boolean> {
  if (!backup.checksum) return true; // older files without checksum are accepted
  const sum = await sha256Text(JSON.stringify(backup.data));
  return sum === null ? true : sum === backup.checksum;
}

/** Download the backup as a .json file to the device. */
export function downloadBackup(backup: LocalBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ste-mobile-care-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Validate an uploaded/parsed backup object. */
export function validateBackup(obj: unknown): { ok: boolean; backup?: LocalBackup; error?: string } {
  if (!obj || typeof obj !== "object") return { ok: false, error: "File is not a valid backup." };
  const b = obj as Partial<LocalBackup>;
  if (!b.data || typeof b.data !== "object") return { ok: false, error: "Backup file has no data." };
  for (const c of COLLECTIONS) {
    if (!Array.isArray(b.data[c as keyof BackupData])) {
      return { ok: false, error: `Backup is incomplete — missing "${c}".` };
    }
  }
  return { ok: true, backup: b as LocalBackup };
}

/** Pull latest data from the server into the local store (online hydration). */
export async function hydrateFromServer(): Promise<{ ok: boolean; counts: Record<string, number> }> {
  const res = await fetch("/api/backup");
  if (!res.ok) throw new Error("server unreachable");
  const b = (await res.json()) as { counts?: Record<string, number>; data?: BackupData };
  if (!b.data) throw new Error("invalid server backup");
  replaceAll(b.data);
  setMeta({ lastSyncedAt: new Date().toISOString() });
  return { ok: true, counts: b.counts ?? getCounts() };
}

/** Push the local store to the server (restore server DB from local backup). */
export async function pushLocalToServer(): Promise<{ ok: boolean; error?: string }> {
  const backup = await buildBackup();
  const res = await fetch("/api/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backup),
  });
  const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !j.ok) return { ok: false, error: j.error || "server restore failed" };
  setMeta({ lastSyncedAt: new Date().toISOString(), pendingRestore: false });
  return { ok: true };
}

export type SyncMode = "server-to-local" | "local-to-server" | "offline" | "empty";

/**
 * Synchronize the cached backup snapshot on dashboard load.
 * A deliberate offline import is pushed first; otherwise a nonempty server
 * takes precedence. If the server is unreachable the snapshot remains on the
 * device, but the live jobs and sales pages still require the server.
 */
export async function smartSync(): Promise<{ mode: SyncMode; counts: Record<string, number> }> {
  const localCounts = getCounts();
  const localTotal = totalRecords(localCounts);
  try {
    const res = await fetch("/api/backup");
    if (!res.ok) throw new Error("server unreachable");
    const b = (await res.json()) as { counts?: Record<string, number>; data?: BackupData };
    const serverTotal = totalRecords(b.counts ?? {});
    // A deliberate offline import must be restored before reading a possibly stale server snapshot.
    if (getMeta().pendingRestore) {
      const r = await pushLocalToServer();
      return { mode: r.ok ? "local-to-server" : "offline", counts: getCounts() };
    }
    if (serverTotal > 0 && b.data) {
      replaceAll(b.data);
      setMeta({ lastSyncedAt: new Date().toISOString() });
      return { mode: "server-to-local", counts: getCounts() };
    }
    if (localTotal > 0) {
      const r = await pushLocalToServer();
      return { mode: r.ok ? "local-to-server" : "offline", counts: getCounts() };
    }
    return { mode: "empty", counts: getCounts() };
  } catch {
    return { mode: "offline", counts: localCounts };
  }
}
