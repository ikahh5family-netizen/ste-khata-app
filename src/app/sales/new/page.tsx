import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { parts, customers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { PosForm } from "@/components/PosForm";

export const dynamic = "force-dynamic";

export default async function NewSale() {
  await ensureSchema();
  const [products, custs] = await Promise.all([
    db.select().from(parts).orderBy(asc(parts.name)),
    db.select({ name: customers.name, phone: customers.phone }).from(customers).orderBy(asc(customers.name)),
  ]);
  return (
    <div>
      <PageHeader title="🧾 New Parts Sale" subtitle="Sell parts / accessories — stock decreases automatically" />
      <PosForm
        products={products.map((p) => ({ id: p.id, name: p.name, model: p.model, category: p.category, salePrice: p.salePrice, costPrice: p.costPrice, stock: p.stock }))}
        customers={custs}
      />
    </div>
  );
}
