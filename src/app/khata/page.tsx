import Link from "next/link";
import { PageHeader, StatCard, Empty } from "@/components/ui";
import { ApiForm, ApiActionButton } from "@/components/ApiForm";
import { getCustomerBalances } from "@/lib/queries";
import { rs, waLink } from "@/lib/format";
import { SHOP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function KhataPage({ searchParams }: { searchParams: Promise<{ q?: string; all?: string }> }) {
  const { q = "", all } = await searchParams;
  const balances = await getCustomerBalances();
  const totalDue = balances.reduce((a, c) => a + Math.max(0, c.balance), 0);
  const debtors = balances.filter((b) => b.balance > 0);
  let list = all ? balances : debtors;
  if (q) list = balances.filter((b) => `${b.name} ${b.phone}`.toLowerCase().includes(q.toLowerCase()));
  list = [...list].sort((a, b) => b.balance - a.balance);
  // Customers left behind after all their jobs/sales were deleted.
  const emptyCustomers = balances.filter((b) => b.jobs === 0 && b.salesCount === 0 && b.balance === 0 && b.paid === 0);

  return (
    <div>
      <PageHeader title="📒 Khata (Credit)" subtitle="How much to collect from each customer" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Credit Due" value={rs(totalDue)} tone="rose" />
        <StatCard label="Customers with Dues" value={String(debtors.length)} tone="amber" />
        <StatCard label="Total Customers" value={String(balances.length)} />
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <form className="flex gap-2 lg:col-span-2">
          <input name="q" defaultValue={q} className="input" placeholder="Customer name / phone..." />
          <button className="btn-light">Search</button>
          <Link href={all ? "/khata" : "/khata?all=1"} className="btn-light shrink-0">
            {all ? "Only Dues" : "All Customers"}
          </Link>
        </form>
        <details className="card p-3" open={balances.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-indigo-600">+ Add New Customer</summary>
          <ApiForm endpoint="/api/khata" actionName="saveCustomer" className="mt-2 space-y-2">
            <input name="name" required placeholder="Customer Name *" className="input" />
            <input name="phone" inputMode="tel" placeholder="Mobile (03XX-XXXXXXX)" className="input" />
            <button type="submit" className="btn-primary w-full">
              ✅ Save Customer
            </button>
          </ApiForm>
        </details>
      </div>

      {emptyCustomers.length > 0 && (
        <div className="card mb-4 flex flex-col gap-2 border-amber-200 bg-amber-50 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-amber-900">
            🧹 <b>{emptyCustomers.length} empty customer record{emptyCustomers.length > 1 ? "s" : ""}</b> left over after deleting jobs/sales (no
            jobs, no sales, no payments).
          </div>
          <ApiActionButton endpoint="/api/khata" payload={{ action: "cleanupOrphans" }} loadingText="Cleaning..." className="btn-light shrink-0">
            Clean up now
          </ApiActionButton>
        </div>
      )}

      {list.length === 0 ? (
        <Empty text={all || q ? "No customer found." : "🎉 No dues from anyone!"} />
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {list.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link href={`/khata/${c.id}`} className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">{c.name[0]?.toUpperCase()}</div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.phone || "no phone"} · {c.jobs} jobs · {c.salesCount} sales
                  </div>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <div className={`text-right font-bold ${c.balance > 0 ? "text-rose-600" : c.balance < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {rs(Math.abs(c.balance))}
                  <div className="text-[10px] font-normal text-slate-500">{c.balance > 0 ? "to collect" : c.balance < 0 ? "advance" : "clear"}</div>
                </div>
                {c.balance > 0 && c.phone && (
                  <a
                    href={waLink(
                      c.phone,
                      `Hello ${c.name} 🙏\nYou have ${rs(c.balance)} pending at ${SHOP_NAME}. Please clear it soon. Thank you!`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-[#25D366] px-2 py-1 text-xs font-semibold text-white"
                    title="WhatsApp reminder"
                  >
                    Remind
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
