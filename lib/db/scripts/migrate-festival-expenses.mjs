import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS festival_expenses (
      id SERIAL PRIMARY KEY,
      festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
      expense_name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      expense_date DATE NOT NULL,
      vendor_name TEXT,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      description TEXT,
      receipt_url TEXT,
      created_by_admin_id UUID NOT NULL REFERENCES admins(id),
      created_by_admin_name TEXT NOT NULL,
      updated_by_admin_id UUID REFERENCES admins(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_festival_expenses_festival_id ON festival_expenses(festival_id);
    CREATE INDEX IF NOT EXISTS idx_festival_expenses_expense_date ON festival_expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_festival_expenses_payment_method ON festival_expenses(payment_method);
    CREATE INDEX IF NOT EXISTS idx_festival_expenses_category ON festival_expenses(category);
    CREATE INDEX IF NOT EXISTS idx_festival_expenses_added_by_admin_id ON festival_expenses(created_by_admin_id);
  `);
  console.log("festival_expenses is ready");
} finally { await pool.end(); }
