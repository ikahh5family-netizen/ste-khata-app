import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { sql } from "drizzle-orm";
import { daysAgoPK, startOfDayPK, dateInputPK } from "./format";

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0) || 0;

async function rows<T = Row>(q: ReturnType<typeof sql>): Promise<T[]> {
  await ensureSchema();
  const r = await db.execute(q);
  return r.rows as T[];
}

export type Stats = {
  repairCount: number;
  repairRevenue: number;
  repairPartsCost: number;
  saleCount: number;
  saleRevenue: number;
  saleCost: number;
  expenses: number;
  purchases: number;
  paymentsReceived: number;
  totalRevenue: number;
  grossProfit: number;
  netProfit: number;
};

export async function getStats(from: Date, to: Date): Promise<Stats> {
  const [j] = await rows(sql`
    select count(*)::int c, coalesce(sum(total),0)::int t, coalesce(sum(parts_cost),0)::int pc
    from repair_jobs where status='delivered' and delivered_at >= ${from} and delivered_at <= ${to}`);
  const [s] = await rows(sql`
    select count(*)::int c, coalesce(sum(total),0)::int t, coalesce(sum(cost),0)::int pc
    from sales where created_at >= ${from} and created_at <= ${to}`);
  const [e] = await rows(sql`select coalesce(sum(amount),0)::int t from expenses where created_at >= ${from} and created_at <= ${to}`);
  const [p] = await rows(sql`select coalesce(sum(total),0)::int t from purchases where created_at >= ${from} and created_at <= ${to}`);
  const [pay] = await rows(sql`select coalesce(sum(amount),0)::int t from payments where created_at >= ${from} and created_at <= ${to}`);

  const repairRevenue = n(j.t);
  const repairPartsCost = n(j.pc);
  const saleRevenue = n(s.t);
  const saleCost = n(s.pc);
  const expenses = n(e.t);
  const grossProfit = repairRevenue - repairPartsCost + (saleRevenue - saleCost);
  return {
    repairCount: n(j.c),
    repairRevenue,
    repairPartsCost,
    saleCount: n(s.c),
    saleRevenue,
    saleCost,
    expenses,
    purchases: n(p.t),
    paymentsReceived: n(pay.t),
    totalRevenue: repairRevenue + saleRevenue,
    grossProfit,
    netProfit: grossProfit - expenses,
  };
}

export type CustomerBalance = {
  id: number;
  name: string;
  phone: string;
  jobDue: number;
  saleDue: number;
  paid: number;
  balance: number;
  jobs: number;
  salesCount: number;
};

export async function getCustomerBalances(): Promise<CustomerBalance[]> {
  const r = await rows(sql`
    select c.id, c.name, c.phone,
      coalesce((select sum(total - paid) from repair_jobs j where j.customer_id=c.id and j.status='delivered'),0)::int job_due,
      coalesce((select sum(total - paid) from sales s where s.customer_id=c.id),0)::int sale_due,
      coalesce((select sum(amount) from payments p where p.customer_id=c.id),0)::int paid,
      (select count(*) from repair_jobs j where j.customer_id=c.id)::int jobs,
      (select count(*) from sales s where s.customer_id=c.id)::int sales_count
    from customers c order by c.name`);
  return r.map((x) => {
    const jobDue = n(x.job_due);
    const saleDue = n(x.sale_due);
    const paid = n(x.paid);
    return {
      id: n(x.id),
      name: String(x.name),
      phone: String(x.phone ?? ""),
      jobDue,
      saleDue,
      paid,
      balance: jobDue + saleDue - paid,
      jobs: n(x.jobs),
      salesCount: n(x.sales_count),
    };
  });
}

export async function getTotalUdhaar() {
  const list = await getCustomerBalances();
  return list.reduce((a, c) => a + Math.max(0, c.balance), 0);
}

export async function getJobStatusCounts() {
  const r = await rows(sql`select status, count(*)::int c from repair_jobs group by status`);
  const out: Record<string, number> = {};
  for (const x of r) out[String(x.status)] = n(x.c);
  return out;
}

export async function getLowStock() {
  return rows<{ id: number; name: string; model: string; stock: number; min_stock: number }>(
    sql`select id, name, model, stock, min_stock from parts where stock <= min_stock order by stock asc, name limit 20`
  );
}

export async function getLast7Days() {
  const from = daysAgoPK(6);
  const r = await rows(sql`
    with d as (
      select (delivered_at at time zone 'UTC' at time zone 'Asia/Karachi')::date as dd, total as amt, 'r' as k from repair_jobs where status='delivered' and delivered_at >= ${from}
      union all
      select (created_at at time zone 'UTC' at time zone 'Asia/Karachi')::date as dd, total as amt, 's' as k from sales where created_at >= ${from}
    ) select dd::text as dd, k, coalesce(sum(amt),0)::int as t from d group by dd, k`);
  const out: { day: string; label: string; repair: number; sale: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgoPK(i);
    const key = dateInputPK(d);
    const label = new Date(d.getTime() + 5 * 3600000).toLocaleDateString("en-PK", { weekday: "short", timeZone: "UTC" });
    out.push({ day: key, label, repair: 0, sale: 0 });
  }
  for (const x of r) {
    const o = out.find((y) => y.day === String(x.dd));
    if (!o) continue;
    if (x.k === "r") o.repair = n(x.t);
    else o.sale = n(x.t);
  }
  return out;
}

export async function getTopRepairs(from: Date, to: Date) {
  return rows<{ repair_type: string; c: number; t: number; profit: number }>(sql`
    select repair_type, count(*)::int c, coalesce(sum(total),0)::int t, coalesce(sum(total - parts_cost),0)::int profit
    from repair_jobs where status='delivered' and delivered_at >= ${from} and delivered_at <= ${to}
    group by repair_type order by t desc limit 8`);
}

export async function getTopModels(from: Date, to: Date) {
  return rows<{ device_model: string; c: number; t: number }>(sql`
    select device_model, count(*)::int c, coalesce(sum(total),0)::int t
    from repair_jobs where received_at >= ${from} and received_at <= ${to}
    group by device_model order by c desc limit 8`);
}

export async function getTopParts(from: Date, to: Date) {
  return rows<{ name: string; q: number; t: number; profit: number }>(sql`
    select si.name, sum(si.qty)::int q, sum(si.qty*si.price)::int t, sum(si.qty*(si.price-si.cost))::int profit
    from sale_items si join sales s on s.id = si.sale_id
    where s.created_at >= ${from} and s.created_at <= ${to}
    group by si.name order by t desc limit 8`);
}

export async function getExpenseBreakdown(from: Date, to: Date) {
  return rows<{ category: string; t: number }>(sql`
    select category, sum(amount)::int t from expenses where created_at >= ${from} and created_at <= ${to}
    group by category order by t desc`);
}

export async function getPaymentModeSplit(from: Date, to: Date) {
  return rows<{ payment_mode: string; t: number }>(sql`
    select payment_mode, sum(paid)::int t from sales where created_at >= ${from} and created_at <= ${to}
    group by payment_mode order by t desc`);
}

export async function getOldPendingJobs(days = 3) {
  const before = new Date(startOfDayPK().getTime() - days * 86400000);
  return rows<{ id: number; customer_name: string; device_model: string; repair_type: string; status: string; received_at: string }>(sql`
    select id, customer_name, device_model, repair_type, status, received_at from repair_jobs
    where status in ('received','in_progress','waiting_part') and received_at < ${before} order by received_at asc limit 10`);
}

export async function getInventoryValue() {
  const [r] = await rows(sql`select coalesce(sum(stock*cost_price),0)::int cost, coalesce(sum(stock*sale_price),0)::int sale, count(*)::int items from parts`);
  return { cost: n(r.cost), sale: n(r.sale), items: n(r.items) };
}
