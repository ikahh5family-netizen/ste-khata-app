"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildBackup,
  downloadBackup,
  getCounts,
  getMeta,
  markImported,
  pushLocalToServer,
  replaceAll,
  smartSync,
  totalRecords,
  validateBackup,
  verifyBackupChecksum,
  type LocalBackup,
} from "@/lib/local-db";

const LABELS: Record<string, string> = {
  customers: "Customers",
  parts: "Parts",
  repairJobs: "Repair Jobs",
  jobParts: "Job Parts",
  sales: "Sales",
  saleItems: "Sale Items",
  payments: "Payments",
  expenses: "Expenses",
  purchases: "Purchases",
};

export function BackupRestoreCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"ok" | "warn" | "info">("info");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [meta, setMeta] = useState<{ lastSyncedAt?: string; lastImportAt?: string }>({});
  const [restored, setRestored] = useState<Record<string, number> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCounts(getCounts());
    setMeta(getMeta());
    smartSync().then((r) => {
      setCounts(getCounts());
      setMeta(getMeta());
      if (r.mode === "server-to-local") setStatus("☁️ Local copy synced with server");
      else if (r.mode === "local-to-server") setStatus("☁️ Local data restored to server");
      else if (r.mode === "offline") setStatus("📴 Server unavailable. A previous backup may be available on this device; live jobs and sales need the server.");
    });
  }, []);

  async function onExport() {
    if (busy) return;
    setBusy(true);
    setStatus("Preparing backup…");
    setStatusTone("info");
    try {
      await smartSync(); // refresh local copy first (falls back to existing local data offline)
      const backup = await buildBackup();
      const total = totalRecords(backup.counts);
      if (total === 0) {
        setStatus("⚠️ No records are available for backup on this device. Reconnect to the server and try again.");
        setStatusTone("warn");
        return;
      }
      downloadBackup(backup);
      setCounts(getCounts());
      setStatus(`✅ Downloaded ${total} records. This JSON file is NOT encrypted${backup.checksum ? " (SHA-256 verifies integrity only)" : ""} — keep it private.`);
      setStatusTone("ok");
    } catch {
      setStatus("⚠️ Export failed — please try again.");
      setStatusTone("warn");
    } finally {
      setBusy(false);
    }
  }

  async function onImportFile(file: File) {
    if (busy) return;
    setBusy(true);
    setStatus("Reading backup file…");
    setStatusTone("info");
    setRestored(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as LocalBackup;
      const v = validateBackup(parsed);
      if (!v.ok || !v.backup) {
        setStatus("⚠️ " + (v.error || "Invalid backup file."));
        setStatusTone("warn");
        return;
      }
      const backup = v.backup;
      const checksumOk = await verifyBackupChecksum(backup);
      if (!checksumOk) {
        setStatus("⚠️ Checksum mismatch — this file may be corrupted or edited.");
        setStatusTone("warn");
        return;
      }
      const total = Object.values(backup.data).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
      if (!window.confirm(`Restore ${total} records from this file?\n\nYour current server data will be replaced if the server is reachable. Keep another backup before continuing.`)) {
        setStatus("");
        return;
      }
      replaceAll(backup.data);
      markImported();
      setRestored(getCounts());
      setStatus("Restoring…");
      let serverRestored = false;
      try {
        const result = await pushLocalToServer();
        serverRestored = result.ok;
      } catch {
        // Local import succeeded; only the server synchronization failed.
      }
      setCounts(getCounts());
      setMeta(getMeta());
      if (serverRestored) {
        setStatus(`✅ Restored ${total} records to the database. Open Jobs or Stock to verify.`);
        router.refresh();
      } else {
        setStatus(`⚠️ File imported on this device, but the database was NOT restored. Live Jobs and Sales will not show these records until the server is reachable. Keep the file and retry the import when online.`);
      }
      setStatusTone(serverRestored ? "ok" : "warn");
    } catch {
      setStatus("⚠️ Import failed. Check the JSON file and available browser storage, then try again. Your saved file has not been changed.");
      setStatusTone("warn");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const localTotal = totalRecords(counts);

  return (
    <div className="card mb-5 border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">💾 Local Backup &amp; Restore</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Download jobs, sales, customers, stock and expenses as a JSON file. Export can use your last synced local snapshot when offline;
            live records still require the server and PostgreSQL. Restore from the file if you change devices or lose browser data.
          </p>
          <p className="mt-1 text-xs font-medium text-amber-800">The JSON file includes customer details and is not encrypted. Keep it private.</p>
          <div className="mt-2 text-xs text-slate-500">
            📱 Local copy on this device: <b>{localTotal} records</b>
            {meta.lastSyncedAt && <> · Synced {new Date(meta.lastSyncedAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</>}
            {meta.lastImportAt && <> · Last import {new Date(meta.lastImportAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button type="button" onClick={onExport} disabled={busy} className="btn-primary w-full sm:w-auto">
            ⬇️ Export Database Backup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-light w-full sm:w-auto">
            ⬆️ Import Database Backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
            }}
          />
        </div>
      </div>

      {busy && <div className="mt-3 text-xs font-medium text-indigo-600 animate-pulse">⏳ {status}</div>}
      {!busy && status && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${
            statusTone === "ok" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : statusTone === "warn" ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-indigo-200 bg-indigo-50 text-indigo-700"
          }`}
        >
          {status}
        </div>
      )}

      {restored && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-2 text-xs font-semibold text-emerald-800">✅ Restored data preview (this device)</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LABELS).map(([k, label]) => (
              <span key={k} className="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm">
                {label}: <b>{restored[k] ?? 0}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
