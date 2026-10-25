import Link from "next/link";
import { navItems } from "@/lib/nav";
import { PageHeader } from "@/components/ui";

export default function MorePage() {
  return (
    <div>
      <PageHeader title="Menu" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {navItems.map((i) => (
          <Link key={i.href} href={i.href} className="card flex flex-col items-center gap-2 py-6 text-center transition hover:-translate-y-0.5">
            <span className="text-3xl">{i.icon}</span>
            <span className="text-sm font-semibold">{i.label}</span>
          </Link>
        ))}
        <Link href="/jobs/new" className="card flex flex-col items-center gap-2 bg-indigo-50 py-6 text-center">
          <span className="text-3xl">➕</span>
          <span className="text-sm font-semibold">New Job</span>
        </Link>
        <Link href="/sales/new" className="card flex flex-col items-center gap-2 bg-emerald-50 py-6 text-center">
          <span className="text-3xl">🛒</span>
          <span className="text-sm font-semibold">New Sale</span>
        </Link>
        <Link href="/help" className="card flex flex-col items-center gap-2 bg-orange-50 py-6 text-center">
          <span className="text-3xl">❓</span>
          <span className="text-sm font-semibold">Help / Kaise use karein</span>
        </Link>
      </div>
    </div>
  );
}
