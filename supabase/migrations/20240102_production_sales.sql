-- Create production_lots table
CREATE TABLE IF NOT EXISTS production_lots (
    id TEXT PRIMARY KEY,
    lot_number TEXT UNIQUE,
    data JSONB,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for production_lots
ALTER TABLE IF EXISTS production_lots ENABLE ROW LEVEL SECURITY;

-- Create Public Access Policies for production_lots
DROP POLICY IF EXISTS "Allow public read access on production_lots" ON production_lots;
CREATE POLICY "Allow public read access on production_lots" ON production_lots
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public modification on production_lots" ON production_lots;
CREATE POLICY "Allow public modification on production_lots" ON production_lots
    FOR ALL USING (true) WITH CHECK (true);

-- Create sales_orders table
CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    order_date DATE,
    status TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for sales_orders
ALTER TABLE IF EXISTS sales_orders ENABLE ROW LEVEL SECURITY;

-- Create Public Access Policies for sales_orders
DROP POLICY IF EXISTS "Allow public read access on sales_orders" ON sales_orders;
CREATE POLICY "Allow public read access on sales_orders" ON sales_orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public modification on sales_orders" ON sales_orders;
CREATE POLICY "Allow public modification on sales_orders" ON sales_orders
    FOR ALL USING (true) WITH CHECK (true);

-- Create sales_invoices table
CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    customer_name TEXT,
    invoice_date DATE,
    total_amount NUMERIC,
    status TEXT,
    data JSONB, -- Stores items, lots used, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for sales_invoices
ALTER TABLE IF EXISTS sales_invoices ENABLE ROW LEVEL SECURITY;

-- Create Public Access Policies for sales_invoices
DROP POLICY IF EXISTS "Allow public read access on sales_invoices" ON sales_invoices;
CREATE POLICY "Allow public read access on sales_invoices" ON sales_invoices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public modification on sales_invoices" ON sales_invoices;
CREATE POLICY "Allow public modification on sales_invoices" ON sales_invoices
    FOR ALL USING (true) WITH CHECK (true);
