import Link from "next/link";
import type { ReactNode } from "react";
import { statusInfo } from "@/lib/constants";

export function AppleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} role="img" aria-label="Apple">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "indigo" | "emerald" | "rose" | "amber" | "violet";
  href?: string;
}) {
  const tones: Record<string, string> = {
    slate: "from-white to-white",
    indigo: "from-indigo-50 to-white",
    emerald: "from-emerald-50 to-white",
    rose: "from-rose-50 to-white",
    amber: "from-amber-50 to-white",
    violet: "from-violet-50 to-white",
  };
  const text: Record<string, string> = {
    slate: "text-slate-900",
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    rose: "text-rose-600",
    amber: "text-amber-700",
    violet: "text-violet-700",
  };
  const inner = (
    <div className={`card h-full bg-gradient-to-br ${tones[tone]}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold sm:text-2xl ${text[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusInfo(status);
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.color}`}>{s.label}</span>;
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center text-sm text-slate-500">
      <div className="text-3xl">🗂️</div>
      {text}
      {action}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
