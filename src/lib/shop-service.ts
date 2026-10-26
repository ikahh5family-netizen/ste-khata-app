import "server-only";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import {
  customers,
  parts,
  repairJobs,
  jobParts,
  sales,
  saleItems,
  payments,
  expenses,
  purchases,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { str, toInt } from "@/lib/format";

export type ActionResult = {
  ok: boolean;
  id?: number;
  redirectTo?: string;
  message?: string;
  error?: string;
};

function refreshAll() {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Ignore when called outside request revalidation context
  }
}

function normalizePhone(phone: string) {
  return phone.replace(/[\s()-]/g, "").trim();
}

export async function findOrCreateCustomer(rawName: string, rawPhone: string): Promise<number | null> {
  await ensureSchema();
  const name = rawName.trim();
  const phone = normalizePhone(rawPhone);
  if (!name && !phone) return null;

  if (phone) {
    const [existing] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
    if (existing) {
      if (name && existing.name === existing.phone) {
        await db.update(customers).set({ name }).where(eq(customers.id, existing.id));
      }
      return existing.id;
    }
  } else {
    const [existing] = await db
      .select()
      .from(customers)
      .where(and(sql`lower(${customers.name}) = lower(${name})`, eq(customers.phone, "")))
      .limit(1);
    if (existing) return existing.id;
  }

  const [created] = await db
    .insert(customers)
    .values({ name: name || phone, phone })
    .returning();
  return created.id;
}

/* ---------------- Repair Jobs ---------------- */

export async function createJobRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const customerName = str(data.customerName) || "Customer";
  const phone = normalizePhone(str(data.phone));
  const deviceModel = str(data.deviceModel);
  const repairType = str(data.repairType);

  if (!deviceModel) return { ok: false, error: "Device model is required (e.g. iPhone 13)" };
  if (!repairType) return { ok: false, error: "Repair type is required (e.g. Screen / Battery)" };

  const stockPartId = toInt(data.stockPartId, 0);
  const stockPartQty = Math.max(1, toInt(data.stockPartQty, 1));
  let extraPartsCost = toInt(data.partsCost, 0);
  let selectedPart: typeof parts.$inferSelect | null = null;

  if (stockPartId > 0) {
    const [p] = await db.select().from(parts).where(eq(parts.id, stockPartId));
    if (p) {
      selectedPart = p;
      extraPartsCost += p.costPrice * stockPartQty;
    }
  }

  const customerId = await findOrCreateCustomer(customerName, phone);
  const [job] = await db
    .insert(repairJobs)
    .values({
      customerId,
      customerName,
      phone,
      deviceModel,
      imei: str(data.imei),
      passcode: str(data.passcode),
      repairType,
      issue: str(data.issue),
      total: Math.max(0, toInt(data.total, 0)),
      partsCost: Math.max(0, extraPartsCost),
      paid: Math.max(0, toInt(data.paid, 0)),
      // The money taken when the phone is received is the advance.
      advancePaid: Math.max(0, toInt(data.paid, 0)),
      warrantyDays: Math.max(0, toInt(data.warrantyDays, 30)),
      technician: str(data.technician),
      notes: str(data.notes),
      status: "received",
    })
    .returning();

  if (selectedPart) {
    await db.insert(jobParts).values({
      jobId: job.id,
      partId: selectedPart.id,
      name: selectedPart.name,
      qty: stockPartQty,
      cost: selectedPart.costPrice,
    });
    await db
      .update(parts)
      .set({ stock: sql`${parts.stock} - ${stockPartQty}` })
      .where(eq(parts.id, selectedPart.id));
  }

  refreshAll();
  return { ok: true, id: job.id, redirectTo: `/jobs/${job.id}?new=1` };
}

export async function updateJobRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  if (!id) return { ok: false, error: "Invalid job ID" };

  const customerName = str(data.customerName) || "Customer";
  const phone = normalizePhone(str(data.phone));
  const deviceModel = str(data.deviceModel);
  const repairType = str(data.repairType);
  if (!deviceModel || !repairType) {
    return { ok: false, error: "Model and repair type are required" };
  }

  const customerId = await findOrCreateCustomer(customerName, phone);
  await db
    .update(repairJobs)
    .set({
      customerId,
      customerName,
      phone,
      deviceModel,
      imei: str(data.imei),
      passcode: str(data.passcode),
      repairType,
      issue: str(data.issue),
      total: Math.max(0, toInt(data.total, 0)),
      warrantyDays: Math.max(0, toInt(data.warrantyDays, 0)),
      technician: str(data.technician),
      notes: str(data.notes),
    })
    .where(eq(repairJobs.id, id));

  refreshAll();
  return { ok: true, id, redirectTo: `/jobs/${id}` };
}

export async function setJobStatusRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  const status = str(data.status);
  if (!id || !status) return { ok: false, error: "Invalid status update" };

  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) return { ok: false, error: "Job not found" };

  if (status === "delivered") {
    // Moving TO delivered via the status chips: keep whatever has been paid so
    // far (the advance). Collecting the balance is done in the Deliver form.
    await db
      .update(repairJobs)
      .set({ status, deliveredAt: new Date() })
      .where(eq(repairJobs.id, id));
    refreshAll();
    return { ok: true, id, message: "Marked as delivered." };
  }

  // Moving BACK to a non-delivered status (Received / In Progress /
  // Waiting Part / Cancelled): the delivery payment is no longer valid, so
  // `paid` reverts to the advance that was actually taken, and `due` grows
  // back automatically. Print receipt reads these same fields.
  const advance = Math.max(0, job.advancePaid);
  const reverted = job.paid !== advance;

  await db
    .update(repairJobs)
    .set({ status, deliveredAt: null, paid: advance })
    .where(eq(repairJobs.id, id));

  refreshAll();
  return {
    ok: true,
    id,
    message: reverted
      ? `Status changed — Paid reset to the advance (${advance > 0 ? "Rs " + advance.toLocaleString("en-PK") : "Rs 0"}).`
      : "Status updated.",
  };
}

export async function deliverJobRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  const receive = Math.max(0, toInt(data.receive, 0));
  const finalTotal = data.total !== undefined && data.total !== null && str(data.total) !== "" ? Math.max(0, toInt(data.total)) : null;

  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) return { ok: false, error: "Job not found" };

  // `advancePaid` stays as the pre-delivery amount so the payment collected
  // at delivery can be rolled back if the status is changed again later.
  const advance = Math.max(0, job.advancePaid);
  await db
    .update(repairJobs)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
      paid: advance + receive,
      ...(finalTotal !== null ? { total: finalTotal } : {}),
    })
    .where(eq(repairJobs.id, id));

  refreshAll();
  return { ok: true, id, message: "Phone marked as delivered!" };
}

export async function addJobPaymentRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  const amount = toInt(data.amount);
  if (!id || amount <= 0) return { ok: false, error: "Enter a valid payment amount" };

  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) return { ok: false, error: "Job not found" };

  // A payment taken while the phone is still in the shop counts as advance,
  // so it survives any later status change. After delivery it is a final
  // settlement and only increases `paid`.
  const isDelivered = job.status === "delivered";
  await db
    .update(repairJobs)
    .set({
      paid: sql`${repairJobs.paid} + ${amount}`,
      ...(isDelivered ? {} : { advancePaid: sql`${repairJobs.advancePaid} + ${amount}` }),
    })
    .where(eq(repairJobs.id, id));

  refreshAll();
  return { ok: true, id, message: "Payment added!" };
}

export async function addJobPartRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const jobId = toInt(data.jobId);
  const partId = toInt(data.partId);
  const qty = Math.max(1, toInt(data.qty, 1));
  const customName = str(data.customName);
  const customCost = toInt(data.customCost);

  if (!jobId) return { ok: false, error: "Job ID missing" };

  if (partId > 0) {
    const [p] = await db.select().from(parts).where(eq(parts.id, partId));
    if (!p) return { ok: false, error: "Part not found in stock" };
    await db.insert(jobParts).values({ jobId, partId, name: p.name, qty, cost: p.costPrice });
    await db.update(parts).set({ stock: sql`${parts.stock} - ${qty}` }).where(eq(parts.id, partId));
    await db
      .update(repairJobs)
      .set({ partsCost: sql`${repairJobs.partsCost} + ${p.costPrice * qty}` })
      .where(eq(repairJobs.id, jobId));
  } else if (customName) {
    await db.insert(jobParts).values({ jobId, partId: null, name: customName, qty, cost: Math.max(0, customCost) });
    await db
      .update(repairJobs)
      .set({ partsCost: sql`${repairJobs.partsCost} + ${Math.max(0, customCost) * qty}` })
      .where(eq(repairJobs.id, jobId));
  } else {
    return { ok: false, error: "Select a part from stock or enter a part name" };
  }

  refreshAll();
  return { ok: true, id: jobId, message: "Part job mein add ho gaya!" };
}

export async function removeJobPartRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  const [jp] = await db.select().from(jobParts).where(eq(jobParts.id, id));
  if (!jp) return { ok: false, error: "Part record not found" };

  if (jp.partId) {
    await db.update(parts).set({ stock: sql`${parts.stock} + ${jp.qty}` }).where(eq(parts.id, jp.partId));
  }
  await db
    .update(repairJobs)
    .set({ partsCost: sql`greatest(0, ${repairJobs.partsCost} - ${jp.cost * jp.qty})` })
    .where(eq(repairJobs.id, jp.jobId));
  await db.delete(jobParts).where(eq(jobParts.id, id));

  refreshAll();
  return { ok: true };
}

export async function deleteJobRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  if (!id) return { ok: false, error: "Invalid job ID" };

  const used = await db.select().from(jobParts).where(eq(jobParts.jobId, id));
  for (const jp of used) {
    if (jp.partId) {
      await db.update(parts).set({ stock: sql`${parts.stock} + ${jp.qty}` }).where(eq(parts.id, jp.partId));
    }
  }
  await db.delete(repairJobs).where(eq(repairJobs.id, id));

  refreshAll();
  return { ok: true, redirectTo: "/jobs" };
}

/* ---------------- Inventory / Stock ---------------- */

export async function savePartRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  const name = str(data.name);
  if (!name) return { ok: false, error: "Part / item name is required" };

  const values = {
    name,
    category: str(data.category) || "Other",
    model: str(data.model),
    costPrice: Math.max(0, toInt(data.costPrice, 0)),
    salePrice: Math.max(0, toInt(data.salePrice, 0)),
    stock: toInt(data.stock, 0),
    minStock: Math.max(0, toInt(data.minStock, 1)),
  };

  if (id > 0) {
    await db.update(parts).set(values).where(eq(parts.id, id));
    refreshAll();
    return { ok: true, id, redirectTo: "/inventory", message: "Part updated!" };
  } else {
    const [inserted] = await db.insert(parts).values(values).returning();
    refreshAll();
    return { ok: true, id: inserted.id, redirectTo: "/inventory", message: "Part added to stock!" };
  }
}

export async function deletePartRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  if (!id) return { ok: false, error: "Invalid part ID" };
  await db.delete(parts).where(eq(parts.id, id));
  refreshAll();
  return { ok: true, redirectTo: "/inventory" };
}

export async function stockInRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const partId = toInt(data.partId);
  const qty = toInt(data.qty);
  const unitCost = Math.max(0, toInt(data.unitCost, 0));
  const supplier = str(data.supplier);

  if (!partId) return { ok: false, error: "Select a part from the list first" };
  if (qty <= 0) return { ok: false, error: "Quantity must be at least 1" };

  const [p] = await db.select().from(parts).where(eq(parts.id, partId));
  if (!p) return { ok: false, error: "Selected part not found" };

  const effectiveCost = unitCost > 0 ? unitCost : p.costPrice;
  await db.insert(purchases).values({
    partId,
    partName: p.name,
    supplier,
    qty,
    unitCost: effectiveCost,
    total: qty * effectiveCost,
  });
  await db
    .update(parts)
    .set({
      stock: sql`${parts.stock} + ${qty}`,
      ...(unitCost > 0 ? { costPrice: unitCost } : {}),
    })
    .where(eq(parts.id, partId));

  refreshAll();
  return { ok: true, id: partId, message: `${p.name} (+${qty}) added to stock!` };
}

/* ---------------- Parts Sale (POS) ---------------- */

export type SaleInput = {
  customerName: string;
  phone: string;
  discount: number;
  paid: number;
  paymentMode: string;
  items: { partId: number | null; name: string; qty: number; price: number; cost: number }[];
};

export async function createSaleRecord(input: SaleInput): Promise<ActionResult> {
  await ensureSchema();
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems
    .map((i) => ({
      partId: i.partId ? toInt(i.partId) : null,
      name: str(i.name),
      qty: toInt(i.qty),
      price: Math.max(0, toInt(i.price)),
      cost: Math.max(0, toInt(i.cost)),
    }))
    .filter((i) => i.qty > 0 && i.name);

  if (!items.length) return { ok: false, error: "Add at least one item to the bill" };

  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const discount = Math.max(0, toInt(input.discount, 0));
  const total = Math.max(0, subtotal - discount);
  const cost = items.reduce((a, i) => a + i.qty * i.cost, 0);
  const paid = Math.min(total, Math.max(0, toInt(input.paid, total)));

  const customerName = str(input.customerName);
  const phone = normalizePhone(str(input.phone));
  const hasCustomer = Boolean(customerName || phone);
  if (paid < total && !hasCustomer) {
    return { ok: false, error: "Enter customer name or mobile number for credit sales" };
  }

  const customerId = hasCustomer ? await findOrCreateCustomer(customerName || phone, phone) : null;

  const [s] = await db
    .insert(sales)
    .values({
      customerId,
      customerName: customerName || "Walk-in",
      phone,
      subtotal,
      discount,
      total,
      cost,
      paid,
      paymentMode: str(input.paymentMode) || "cash",
    })
    .returning();

  for (const i of items) {
    await db.insert(saleItems).values({
      saleId: s.id,
      partId: i.partId,
      name: i.name,
      qty: i.qty,
      price: i.price,
      cost: i.cost,
    });
    if (i.partId) {
      await db.update(parts).set({ stock: sql`${parts.stock} - ${i.qty}` }).where(eq(parts.id, i.partId));
    }
  }

  refreshAll();
  return { ok: true, id: s.id, redirectTo: `/sales/${s.id}?new=1` };
}

export async function deleteSaleRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  if (!id) return { ok: false, error: "Invalid sale ID" };

  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  for (const i of items) {
    if (i.partId) {
      await db.update(parts).set({ stock: sql`${parts.stock} + ${i.qty}` }).where(eq(parts.id, i.partId));
    }
  }
  await db.delete(sales).where(eq(sales.id, id));

  refreshAll();
  return { ok: true, redirectTo: "/sales" };
}

/* ---------------- Khata ---------------- */

export async function saveCustomerRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  const name = str(data.name);
  const phone = normalizePhone(str(data.phone));
  const notes = str(data.notes);
  if (!name && !phone) return { ok: false, error: "Enter customer name" };

  const values = { name: name || phone, phone, notes };
  if (id > 0) {
    await db.update(customers).set(values).where(eq(customers.id, id));
    refreshAll();
    return { ok: true, id, message: "Customer details saved!" };
  }

  const [c] = await db.insert(customers).values(values).returning();
  refreshAll();
  return { ok: true, id: c.id, redirectTo: `/khata/${c.id}` };
}

export async function addPaymentRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const customerId = toInt(data.customerId);
  const amount = toInt(data.amount);
  if (!customerId) return { ok: false, error: "Select a customer" };
  if (amount <= 0) return { ok: false, error: "Enter a valid amount" };

  await db.insert(payments).values({
    customerId,
    amount,
    mode: str(data.mode) || "cash",
    note: str(data.note),
  });

  refreshAll();
  return { ok: true, message: "Payment added to khata!" };
}

export async function deletePaymentRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  if (!id) return { ok: false, error: "Invalid payment ID" };
  await db.delete(payments).where(eq(payments.id, id));
  refreshAll();
  return { ok: true };
}

/* ---------------- Expenses ---------------- */

export async function addExpenseRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const amount = toInt(data.amount);
  if (amount <= 0) return { ok: false, error: "Enter expense amount" };

  await db.insert(expenses).values({
    category: str(data.category) || "Other",
    amount,
    note: str(data.note),
  });

  refreshAll();
  return { ok: true, message: "Expense saved!" };
}

export async function deleteExpenseRecord(data: Record<string, unknown>): Promise<ActionResult> {
  await ensureSchema();
  const id = toInt(data.id);
  if (!id) return { ok: false, error: "Invalid expense ID" };
  await db.delete(expenses).where(eq(expenses.id, id));
  refreshAll();
  return { ok: true };
}

/* ---------------- Demo Data ---------------- */

export async function seedDemoData(): Promise<ActionResult> {
  await ensureSchema();
  const existing = await db.select({ c: sql<number>`count(*)::int` }).from(parts);
  if ((existing[0]?.c ?? 0) > 0) {
    return { ok: true, redirectTo: "/", message: "Stock already exists" };
  }

  const P = [
    ["iPhone 11 Display (OLED)", "Display", "iPhone 11", 7500, 12500, 4, 2],
    ["iPhone 12 / 12 Pro Display OLED", "Display", "iPhone 12", 14000, 21000, 3, 2],
    ["iPhone 13 Display OLED", "Display", "iPhone 13", 18000, 26000, 2, 2],
    ["iPhone 14 Pro Max Display Original", "Display", "iPhone 14 Pro Max", 48000, 62000, 1, 1],
    ["iPhone XR Battery", "Battery", "iPhone XR", 3000, 5500, 6, 3],
    ["iPhone 11 Battery", "Battery", "iPhone 11", 3500, 6500, 8, 3],
    ["iPhone 12 Battery", "Battery", "iPhone 12", 4500, 8000, 5, 3],
    ["iPhone 13 Battery", "Battery", "iPhone 13", 5500, 9500, 2, 3],
    ["iPhone 12 Charging Flex", "Charging Flex", "iPhone 12", 1800, 4000, 5, 2],
    ["iPhone 13 Pro Back Glass", "Back Glass", "iPhone 13 Pro", 1200, 5000, 4, 2],
    ["iPhone 14 Rear Camera", "Camera", "iPhone 14", 11000, 18000, 1, 1],
    ["20W USB-C Adapter", "Cable / Charger", "All", 1200, 2500, 15, 5],
    ["Type-C to Lightning Cable", "Cable / Charger", "All", 400, 1200, 25, 10],
    ["Tempered Glass 9D", "Tempered Glass", "All", 80, 500, 80, 20],
    ["Silicone Cover iPhone 13", "Cover", "iPhone 13", 300, 1200, 12, 5],
  ] as const;

  const inserted = await db
    .insert(parts)
    .values(
      P.map(([name, category, model, costPrice, salePrice, stock, minStock]) => ({
        name,
        category,
        model,
        costPrice,
        salePrice,
        stock,
        minStock,
      }))
    )
    .returning();

  const now = Date.now();
  const day = 86400000;
  const cust = [
    ["Ali Raza", "03001234567"],
    ["Usman Khan", "03211234567"],
    ["Ayesha Malik", "03331234567"],
    ["Imran Butt", "03451234567"],
    ["Hina Sheikh", "03121234567"],
  ];
  const custIds: number[] = [];
  for (const [name, phone] of cust) {
    const [c] = await db.insert(customers).values({ name, phone }).returning();
    custIds.push(c.id);
  }

  const jobs: [number, string, string, number, number, number, string, number][] = [
    [0, "iPhone 13", "Screen / Display", 26000, 18000, 26000, "delivered", 0],
    [1, "iPhone 11", "Battery", 6500, 3500, 6500, "delivered", 1],
    [2, "iPhone 12", "Charging Port", 4000, 1800, 2000, "delivered", 2],
    [3, "iPhone 13 Pro", "Back Glass", 8000, 1200, 8000, "delivered", 3],
    [4, "iPhone XR", "Battery", 5500, 3000, 0, "ready", 0],
    [0, "iPhone 14 Pro Max", "Face ID", 15000, 0, 3000, "in_progress", 1],
    [1, "iPhone 15", "Water Damage", 10000, 0, 2000, "received", 0],
    [2, "iPhone 12 Pro", "Motherboard / IC", 18000, 4000, 5000, "waiting_part", 4],
    [3, "iPhone 11", "Screen / Display", 12500, 7500, 12500, "delivered", 5],
    [4, "iPhone 13", "Battery", 9500, 5500, 9500, "delivered", 6],
  ];
  for (const [ci, model, type, total, pc, paid, status, ago] of jobs) {
    const t = new Date(now - ago * day - 3 * 3600000);
    await db.insert(repairJobs).values({
      customerId: custIds[ci],
      customerName: cust[ci][0],
      phone: cust[ci][1],
      deviceModel: model,
      repairType: type,
      issue: type + " issue",
      total,
      partsCost: pc,
      paid,
      status,
      warrantyDays: type.includes("Screen") || type === "Battery" ? 90 : 30,
      receivedAt: new Date(t.getTime() - day),
      deliveredAt: status === "delivered" ? t : null,
    });
  }

  const byName = (s: string) => inserted.find((p) => p.name.startsWith(s))!;
  const saleData: [string, number][][] = [
    [["Tempered Glass", 2], ["Type-C to Lightning", 1]],
    [["20W USB-C", 1]],
    [["Silicone Cover", 1], ["Tempered Glass", 1]],
    [["20W USB-C", 1], ["Type-C to Lightning", 1]],
  ];
  for (let i = 0; i < saleData.length; i++) {
    const its = saleData[i].map(([n, q]) => {
      const p = byName(n);
      return { partId: p.id, name: p.name, qty: q, price: p.salePrice, cost: p.costPrice };
    });
    const total = its.reduce((a, x) => a + x.qty * x.price, 0);
    const cost = its.reduce((a, x) => a + x.qty * x.cost, 0);
    const [s] = await db
      .insert(sales)
      .values({
        customerName: "Walk-in",
        subtotal: total,
        total,
        cost,
        paid: total,
        paymentMode: i % 2 ? "jazzcash" : "cash",
        createdAt: new Date(now - i * day),
      })
      .returning();
    for (const it of its) await db.insert(saleItems).values({ saleId: s.id, ...it });
  }

  await db.insert(expenses).values([
    { category: "Tea / Food", amount: 300, note: "Tea", createdAt: new Date(now) },
    { category: "Transport", amount: 800, note: "Parts from Hall Road", createdAt: new Date(now - day) },
    { category: "Bijli (Electricity)", amount: 9500, note: "Bill", createdAt: new Date(now - 4 * day) },
  ]);

  refreshAll();
  return { ok: true, redirectTo: "/", message: "Demo data loaded!" };
}
