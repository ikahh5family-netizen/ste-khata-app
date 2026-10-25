"use client";

import { useEffect, useRef, useState } from "react";
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
      else if (r.mode === "offline") setStatus("📴 Server unavailable — using local data on this device");
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
      downloadBackup(backup);
      const total = totalRecords(backup.counts);
      setCounts(getCounts());
      setStatus(`✅ Backup downloaded — ${total} records saved to your device (secure .json${backup.checksum ? " with integrity checksum" : ""}).`);
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
      const total = totalRecords(backup.counts ?? {});
      if (!window.confirm(`Restore ${total} records from this backup?\n\nThis will replace the current data on this device.`)) {
        setStatus("");
        return;
      }
      replaceAll(backup.data);
      setRestored(backup.counts ?? getCounts());
      setStatus("Restoring…");
      const server = await pushLocalToServer();
      setCounts(getCounts());
      setMeta(getMeta());
      if (server.ok) {
        setStatus(`✅ Restored ${total} records on this device AND on the server. App state is back.`);
      } else {
        setStatus(`✅ Restored ${total} records on this device (local). Will sync to the server automatically when it is available.`);
      }
      setStatusTone("ok");
    } catch {
      setStatus("⚠️ Could not read the file — please select a valid backup .json file.");
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
            Save ALL data (repair jobs, sales, customers, stock, khata, expenses) as a secure .json file on your device — works fully offline.
            Import it back anytime, even if browser cache is cleared or Windows crashes.
          </p>
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
