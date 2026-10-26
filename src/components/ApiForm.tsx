"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type ApiResponse = {
  ok?: boolean;
  id?: number;
  redirectTo?: string;
  message?: string;
  error?: string;
};

export function ApiForm({
  endpoint,
  actionName,
  redirectTo,
  resetOnSuccess = false,
  hideSuccessBanner = false,
  className = "",
  children,
}: {
  endpoint: string;
  actionName?: string;
  redirectTo?: string;
  resetOnSuccess?: boolean;
  hideSuccessBanner?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = {};
    fd.forEach((val, key) => {
      if (typeof val === "string") payload[key] = val;
    });
    if (actionName) payload.action = actionName;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save. Please try again.");
        setSubmitting(false);
        return;
      }

      if (resetOnSuccess) {
        form.reset();
      }

      const target = data.redirectTo || redirectTo;
      if (target) {
        router.push(target);
        router.refresh();
        return;
      }

      if (!hideSuccessBanner) {
        setSuccess(data.message || "Saved!");
        setTimeout(() => setSuccess(""), 3500);
      }
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form action={endpoint} method="POST" onSubmit={onSubmit} className={className}>
      {actionName && <input type="hidden" name="action" value={actionName} />}
      <fieldset disabled={submitting} className="contents">
        {children}
      </fieldset>
      {submitting && (
        <div className="mt-2 text-xs font-medium text-indigo-600 animate-pulse">
          ⏳ Saving...
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          ✅ {success}
        </div>
      )}
    </form>
  );
}

export function ApiActionButton({
  endpoint,
  payload,
  className = "",
  loadingText,
  children,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  className?: string;
  loadingText?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || !data.ok) {
        setError(data.error || "Action failed");
        setLoading(false);
        return;
      }
      if (data.redirectTo) {
        router.push(data.redirectTo);
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={handleClick} disabled={loading} className={className}>
        {loading ? loadingText || "..." : children}
      </button>
      {error && <span className="mt-1 text-[11px] text-rose-600">{error}</span>}
    </span>
  );
}

export function ConfirmDeleteButton({
  endpoint,
  payload,
  confirmText = "Are you sure you want to delete?",
  className = "btn-danger w-full",
  children,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  confirmText?: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function doDelete() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not delete");
        setLoading(false);
        return;
      }
      if (data.redirectTo) {
        router.push(data.redirectTo);
      }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={className}>
        {children}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs">
      <span className="font-semibold text-rose-800">{confirmText}</span>
      <button
        type="button"
        disabled={loading}
        onClick={doDelete}
        className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Yes, Delete"}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => setAsking(false)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
      >
        Cancel
      </button>
      {error && <span className="w-full text-rose-600">{error}</span>}
    </div>
  );
}
