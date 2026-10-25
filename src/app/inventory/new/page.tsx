import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PartForm } from "@/components/PartForm";

export default function NewPart() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/inventory" className="text-sm text-slate-500">
        ← Stock
      </Link>
      <PageHeader title="New Part / Item" />
      <PartForm />
    </div>
  );
}
