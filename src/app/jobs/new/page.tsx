import Link from "next/link";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { customers, parts } from "@/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/JobForm";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | undefined>>;

export default async function NewJobPage({ searchParams }: { searchParams: SP }) {
  await ensureSchema();
  const sp = await searchParams;
  const [custs, stockParts] = await Promise.all([
    db.select({ name: customers.name, phone: customers.phone }).from(customers).orderBy(asc(customers.name)),
    db
      .select({
        id: parts.id,
        name: parts.name,
        costPrice: parts.costPrice,
        salePrice: parts.salePrice,
        stock: parts.stock,
      })
      .from(parts)
      .orderBy(asc(parts.name)),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New Repair Job"
        subtitle="Fill in the details when receiving the phone"
        action={
          <Link href="/ai" className="btn-light">
            ✨ Fill with AI
          </Link>
        }
      />
      <JobForm
        customers={custs}
        stockParts={stockParts}
        defaults={{
          customerName: sp.customerName ?? "",
          phone: sp.phone ?? "",
          deviceModel: sp.deviceModel ?? "",
          repairType: sp.repairType ?? "",
          imei: sp.imei ?? "",
          issue: sp.issue ?? "",
          total: sp.total ? parseInt(sp.total, 10) || 0 : 0,
          paid: sp.paid ? parseInt(sp.paid, 10) || 0 : 0,
          warrantyDays: 30,
        }}
      />
    </div>
  );
}
