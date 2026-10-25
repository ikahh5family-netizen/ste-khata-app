import "server-only";
import { db } from "@/db";
import { customers, parts, repairJobs, jobParts, sales, saleItems, payments, expenses, purchases } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { JobPayload, PartPayload, SalePayload } from "./api";

const num = (v: unknown, def = 0) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? (n as number) : def;
};
const txt = (v: unknown) => String(v ?? "").trim();

export async function findOrCreateCustomer(name: string, phone: string): Promise<number | null> {
  name = name.trim();
  phone = phone.replace(/\s/g, "");
  if (!name && !phone) return null;
  if (phone) {
    const [c] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
    if (c) return c.id;
  } else {
    const [c] = await db
      .select()
      .from(customers)
      .where(and(sql`lower(${customers.name}) = lower(${name})`, eq(customers.phone, "")))
      .limit(1);
    if (c) return c.id;
  }
  const [c] = await db.insert(customers).values({ name: name || phone, phone }).returning();
  return c.id;
}

/* ---------------- Repair Jobs ---------------- */

export async function createJobRecord(d: JobPayload): Promise<number> {
  if (!txt(d.customerName)) throw new Error("Customer ka naam zaroori hai");
  if (!txt(d.deviceModel)) throw new Error("Mobile model zaroori hai");
  if (!txt(d.repairType)) throw new Error("Repair type zaroori hai");
  const customerId = await findOrCreateCustomer(txt(d.customerName) || "Customer", txt(d.phone));
  const [job] = await db
    .insert(repairJobs)
    .values({
      customerId,
      customerName: txt(d.customerName) || "Customer",
      phone: txt(d.phone),
      deviceModel: txt(d.deviceModel) || "iPhone",
      imei: txt(d.imei),
      passcode: txt(d.passcode),
      repairType: txt(d.repairType) || "Other",
      issue: txt(d.issue),
      total: num(d.total),
      partsCost: num(d.partsCost),
      paid: num(d.paid),
      warrantyDays: num(d.warrantyDays),
      technician: txt(d.technician),
      notes: txt(d.notes),
      status: "received",
    })
    .returning();
  return job.id;
}

export async function updateJobRecord(id: number, d: JobPayload) {
  if (!id) throw new Error("Job id ghalat hai");
  const customerId = await findOrCreateCustomer(txt(d.customerName) || "Customer", txt(d.phone));
  await db
    .update(repairJobs)
    .set({
      customerId,
      customerName: txt(d.customerName) || "Customer",
      phone: txt(d.phone),
      deviceModel: txt(d.deviceModel),
      imei: txt(d.imei),
      passcode: txt(d.passcode),
      repairType: txt(d.repairType),
      issue: txt(d.issue),
      total: num(d.total),
      warrantyDays: num(d.warrantyDays),
      technician: txt(d.technician),
      notes: txt(d.notes),
    })
    .where(eq(repairJobs.id, id));
}

export async function setJobStatusRecord(id: number, status: string) {
  if (!id || !status) throw new Error("Status ghalat hai");
  await db
    .update(repairJobs)
    .set({ status, deliveredAt: status === "delivered" ? new Date() : null })
    .where(eq(repairJobs.id, id));
}

export async function deliverJobRecord(id: number, receive: number, finalTotal?: number) {
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id));
  if (!job) throw new Error("Job nahi mila");
  await db
    .update(repairJobs)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
      paid: job.paid + num(receive),
      ...(finalTotal !== undefined ? { total: num(finalTotal) } : {}),
    })
    .where(eq(repairJobs.id, id));
}

export async function addJobPaymentRecord(id: number, amount: number) {
  if (!id || !num(amount)) throw new Error("Amount daalein");
  await db.update(repairJobs).set({ paid: sql`${repairJobs.paid} + ${num(amount)}` }).where(eq(repairJobs.id, id));
}

export async function addJobPartRecord(jobId: number, d: { partId?: number; qty?: number; customName?: string; customCost?: number }) {
  const [job] = await db.select({ id: repairJobs.id }).from(repairJobs).where(eq(repairJobs.id, num(jobId)));
  if (!job) throw new Error("Job nahi mila");
  const qty = Math.max(1, num(d.qty, 1));
  const partId = num(d.partId);
  if (partId) {
    const [p] = await db.select().from(parts).where(eq(parts.id, partId));
    if (!p) throw new Error("Part nahi mila");
    await db.insert(jobParts).values({ jobId, partId, name: p.name, qty, cost: p.costPrice });
    await db.update(parts).set({ stock: sql`${parts.stock} - ${qty}` }).where(eq(parts.id, partId));
    await db.update(repairJobs).set({ partsCost: sql`${repairJobs.partsCost} + ${p.costPrice * qty}` }).where(eq(repairJobs.id, jobId));
  } else if (txt(d.customName) && num(d.customCost)) {
    await db.insert(jobParts).values({ jobId, partId: null, name: txt(d.customName), qty, cost: num(d.customCost) });
    await db.update(repairJobs).set({ partsCost: sql`${repairJobs.partsCost} + ${num(d.customCost) * qty}` }).where(eq(repairJobs.id, jobId));
  } else {
    throw new Error("Part chunein ya naam + cost likhein");
  }
}

export async function removeJobPartRecord(id: number) {
  const [jp] = await db.select().from(jobParts).where(eq(jobParts.id, id));
  if (!jp) return;
  if (jp.partId) await db.update(parts).set({ stock: sql`${parts.stock} + ${jp.qty}` }).where(eq(parts.id, jp.partId));
  await db
    .update(repairJobs)
    .set({ partsCost: sql`greatest(0, ${repairJobs.partsCost} - ${jp.cost * jp.qty})` })
    .where(eq(repairJobs.id, jp.jobId));
  await db.delete(jobParts).where(eq(jobParts.id, id));
}

export async function deleteJobRecord(id: number) {
  const used = await db.select().from(jobParts).where(eq(jobParts.jobId, id));
  for (const jp of used) {
    if (jp.partId) await db.update(parts).set({ stock: sql`${parts.stock} + ${jp.qty}` }).where(eq(parts.id, jp.partId));
  }
  await db.delete(repairJobs).where(eq(repairJobs.id, id));
}

/* ---------------- Parts Sale ---------------- */

export async function createSaleRecord(input: SalePayload): Promise<number> {
  const items = (input.items || []).filter((i) => i.qty > 0 && txt(i.name));
  if (!items.length) throw new Error("Koi item nahi hai");
  const subtotal = items.reduce((a, i) => a + num(i.qty) * num(i.price), 0);
  const discount = Math.max(0, num(input.discount));
  const total = Math.max(0, subtotal - discount);
  const cost = items.reduce((a, i) => a + num(i.qty) * num(i.cost), 0);
  const paid = Math.min(total, Math.max(0, num(input.paid, total)));
  const hasCustomer = txt(input.customerName) || txt(input.phone);
  if (paid < total && !hasCustomer) throw new Error("Dues ke liye customer ka naam/phone daalein");
  const customerId = hasCustomer ? await findOrCreateCustomer(txt(input.customerName) || txt(input.phone), txt(input.phone)) : null;
  const [s] = await db
    .insert(sales)
    .values({
      customerId,
      customerName: txt(input.customerName) || "Walk-in",
      phone: txt(input.phone),
      subtotal,
      discount,
      total,
      cost,
      paid,
      paymentMode: txt(input.paymentMode) || "cash",
    })
    .returning();
  for (const i of items) {
    await db.insert(saleItems).values({ saleId: s.id, partId: i.partId, name: txt(i.name), qty: num(i.qty), price: num(i.price), cost: num(i.cost) });
    if (i.partId) await db.update(parts).set({ stock: sql`${parts.stock} - ${num(i.qty)}` }).where(eq(parts.id, i.partId));
  }
  return s.id;
}

export async function deleteSaleRecord(id: number) {
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  for (const i of items) {
    if (i.partId) await db.update(parts).set({ stock: sql`${parts.stock} + ${i.qty}` }).where(eq(parts.id, i.partId));
  }
  await db.delete(sales).where(eq(sales.id, id));
}

/* ---------------- Inventory ---------------- */

export async function savePartRecord(id: number | undefined, d: PartPayload): Promise<number> {
  if (!txt(d.name)) throw new Error("Part ka naam zaroori hai");
  const values = {
    name: txt(d.name),
    category: txt(d.category) || "Other",
    model: txt(d.model),
    costPrice: num(d.costPrice),
    salePrice: num(d.salePrice),
    stock: num(d.stock),
    minStock: num(d.minStock, 1),
  };
  if (id) {
    await db.update(parts).set(values).where(eq(parts.id, id));
    return id;
  }
  const [p] = await db.insert(parts).values(values).returning();
  return p.id;
}

export async function deletePartRecord(id: number) {
  await db.delete(parts).where(eq(parts.id, id));
}

export async function stockInRecord(partId: number, qty: number, unitCost: number, supplier: string) {
  const [p] = await db.select().from(parts).where(eq(parts.id, num(partId)));
  if (!p) throw new Error("Part nahi mila");
  if (num(qty) <= 0) throw new Error("Qty 1 ya zyada daalein");
  await db.insert(purchases).values({ partId: p.id, partName: p.name, supplier: txt(supplier), qty: num(qty), unitCost: num(unitCost), total: num(qty) * num(unitCost) });
  await db
    .update(parts)
    .set({ stock: sql`${parts.stock} + ${num(qty)}`, ...(num(unitCost) ? { costPrice: num(unitCost) } : {}) })
    .where(eq(parts.id, p.id));
}

/* ---------------- Khata ---------------- */

export async function saveCustomerRecord(id: number | undefined, d: { name?: string; phone?: string; notes?: string }): Promise<number> {
  const values = { name: txt(d.name) || "Customer", phone: txt(d.phone), notes: txt(d.notes) };
  if (id) {
    await db.update(customers).set(values).where(eq(customers.id, id));
    return id;
  }
  const [c] = await db.insert(customers).values(values).returning();
  return c.id;
}

export async function addPaymentRecord(customerId: number, amount: number, mode: string, note: string) {
  if (!num(customerId) || !num(amount)) throw new Error("Amount daalein");
  await db.insert(payments).values({ customerId: num(customerId), amount: num(amount), mode: txt(mode) || "cash", note: txt(note) });
}

export async function deletePaymentRecord(id: number) {
  await db.delete(payments).where(eq(payments.id, id));
}

/* ---------------- Expenses ---------------- */

export async function addExpenseRecord(category: string, amount: number, note: string) {
  if (!num(amount)) throw new Error("Amount daalein");
  await db.insert(expenses).values({ category: txt(category) || "Other", amount: num(amount), note: txt(note) });
}

export async function deleteExpenseRecord(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id));
}

/* ---------------- Demo data ---------------- */

export async function seedDemoRecord(): Promise<"seeded" | "exists"> {
  const existing = await db.select({ c: sql<number>`count(*)::int` }).from(parts);
  if ((existing[0]?.c ?? 0) > 0) return "exists";
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
    .values(P.map(([name, category, model, costPrice, salePrice, stock, minStock]) => ({ name, category, model, costPrice, salePrice, stock, minStock })))
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
      issue: type + " problem",
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
      .values({ customerName: "Walk-in", subtotal: total, total, cost, paid: total, paymentMode: i % 2 ? "jazzcash" : "cash", createdAt: new Date(now - i * day) })
      .returning();
    for (const it of its) await db.insert(saleItems).values({ saleId: s.id, ...it });
  }
  await db.insert(expenses).values([
    { category: "Tea / Food", amount: 300, note: "Chai", createdAt: new Date(now) },
    { category: "Transport", amount: 800, note: "Buying parts from Hall Road", createdAt: new Date(now - day) },
    { category: "Bijli (Electricity)", amount: 9500, note: "Bill", createdAt: new Date(now - 4 * day) },
  ]);
  return "seeded";
}
