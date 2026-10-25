import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { repairJobs, customers } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/JobForm";
import { jobNo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const id = parseInt((await params).id, 10);
  if (!Number.isFinite(id)) notFound();
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) notFound();
  const custs = await db.select({ name: customers.name, phone: customers.phone }).from(customers).orderBy(asc(customers.name));
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/jobs/${id}`} className="text-sm text-slate-500">
        ← Back
      </Link>
      <PageHeader title={`Edit ${jobNo(id)}`} />
      <JobForm defaults={job} customers={custs} isEdit />
    </div>
  );
}
