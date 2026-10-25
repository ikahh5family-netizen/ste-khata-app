import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { parts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { PartForm } from "@/components/PartForm";
import { ConfirmDeleteButton } from "@/components/ApiForm";

export const dynamic = "force-dynamic";

export default async function EditPart({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const id = parseInt((await params).id, 10);
  if (!Number.isFinite(id)) notFound();
  const [part] = await db.select().from(parts).where(eq(parts.id, id));
  if (!part) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/inventory" className="text-sm text-slate-500">
        ← Stock
      </Link>
      <PageHeader title={part.name} subtitle="Edit Part" />
      <PartForm part={part} />
      <div className="mt-4">
        <ConfirmDeleteButton endpoint="/api/parts" payload={{ action: "delete", id: part.id }} confirmText="Delete this part from stock?" className="btn-danger">
          🗑️ Delete Part
        </ConfirmDeleteButton>
      </div>
    </div>
  );
}
