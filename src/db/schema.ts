import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Other"),
  model: text("model").notNull().default(""),
  costPrice: integer("cost_price").notNull().default(0),
  salePrice: integer("sale_price").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const repairJobs = pgTable("repair_jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  deviceModel: text("device_model").notNull(),
  imei: varchar("imei", { length: 30 }).notNull().default(""),
  passcode: varchar("passcode", { length: 30 }).notNull().default(""),
  repairType: text("repair_type").notNull(),
  issue: text("issue").notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("received"),
  total: integer("total").notNull().default(0),
  partsCost: integer("parts_cost").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  // Advance actually received before delivery; used when a delivered job is reopened.
  advancePaid: integer("advance_paid").notNull().default(0),
  warrantyDays: integer("warranty_days").notNull().default(0),
  technician: text("technician").notNull().default(""),
  notes: text("notes").notNull().default(""),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

export const jobParts = pgTable("job_parts", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => repairJobs.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => parts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
  cost: integer("cost").notNull().default(0),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull().default("Walk-in"),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  cost: integer("cost").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  paymentMode: varchar("payment_mode", { length: 20 }).notNull().default("cash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => parts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
  price: integer("price").notNull().default(0),
  cost: integer("cost").notNull().default(0),
});

// Khata payments: money received from customer against old dues
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  mode: varchar("mode", { length: 20 }).notNull().default("cash"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id, { onDelete: "set null" }),
  partName: text("part_name").notNull(),
  supplier: text("supplier").notNull().default(""),
  qty: integer("qty").notNull(),
  unitCost: integer("unit_cost").notNull(),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type RepairJob = typeof repairJobs.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
