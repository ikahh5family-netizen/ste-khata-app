import { pool } from "@/db";

const globalForSchema = globalThis as typeof globalThis & {
  __steSchemaReady?: Promise<void>;
};

export function ensureSchema(): Promise<void> {
  if (!globalForSchema.__steSchemaReady) {
    globalForSchema.__steSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone VARCHAR(20) NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS parts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Other',
          model TEXT NOT NULL DEFAULT '',
          cost_price INTEGER NOT NULL DEFAULT 0,
          sale_price INTEGER NOT NULL DEFAULT 0,
          stock INTEGER NOT NULL DEFAULT 0,
          min_stock INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS repair_jobs (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
          customer_name TEXT NOT NULL,
          phone VARCHAR(20) NOT NULL DEFAULT '',
          device_model TEXT NOT NULL,
          imei VARCHAR(30) NOT NULL DEFAULT '',
          passcode VARCHAR(30) NOT NULL DEFAULT '',
          repair_type TEXT NOT NULL,
          issue TEXT NOT NULL DEFAULT '',
          status VARCHAR(20) NOT NULL DEFAULT 'received',
          total INTEGER NOT NULL DEFAULT 0,
          parts_cost INTEGER NOT NULL DEFAULT 0,
          paid INTEGER NOT NULL DEFAULT 0,
          advance_paid INTEGER NOT NULL DEFAULT 0,
          warranty_days INTEGER NOT NULL DEFAULT 0,
          technician TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          received_at TIMESTAMP NOT NULL DEFAULT NOW(),
          delivered_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS job_parts (
          id SERIAL PRIMARY KEY,
          job_id INTEGER NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
          part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          qty INTEGER NOT NULL DEFAULT 1,
          cost INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sales (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
          customer_name TEXT NOT NULL DEFAULT 'Walk-in',
          phone VARCHAR(20) NOT NULL DEFAULT '',
          subtotal INTEGER NOT NULL DEFAULT 0,
          discount INTEGER NOT NULL DEFAULT 0,
          total INTEGER NOT NULL DEFAULT 0,
          cost INTEGER NOT NULL DEFAULT 0,
          paid INTEGER NOT NULL DEFAULT 0,
          payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sale_items (
          id SERIAL PRIMARY KEY,
          sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
          part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          qty INTEGER NOT NULL DEFAULT 1,
          price INTEGER NOT NULL DEFAULT 0,
          cost INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          mode VARCHAR(20) NOT NULL DEFAULT 'cash',
          note TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          category TEXT NOT NULL,
          amount INTEGER NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS purchases (
          id SERIAL PRIMARY KEY,
          part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
          part_name TEXT NOT NULL,
          supplier TEXT NOT NULL DEFAULT '',
          qty INTEGER NOT NULL,
          unit_cost INTEGER NOT NULL,
          total INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // --- Migrations for databases created before a column existed ---
      await pool.query(`
        ALTER TABLE repair_jobs ADD COLUMN IF NOT EXISTS advance_paid INTEGER NOT NULL DEFAULT 0;
      `);
      // Backfill advance_paid once: for jobs not yet delivered the whole paid
      // amount IS the advance. Delivered jobs keep 0 so that reverting them
      // clears the delivery payment (as requested).
      await pool.query(`
        UPDATE repair_jobs
        SET advance_paid = paid
        WHERE advance_paid = 0 AND paid > 0 AND status <> 'delivered';
      `);
    })().catch((err) => {
      globalForSchema.__steSchemaReady = undefined;
      throw err;
    });
  }
  return globalForSchema.__steSchemaReady;
}
