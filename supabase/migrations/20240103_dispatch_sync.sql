-- Create sales_dispatch_assignments table for planning active vehicles
CREATE TABLE IF NOT EXISTS sales_dispatch_assignments (
    id TEXT PRIMARY KEY, -- vehicle_id (e.g. V1) or unique assignment ID
    vehicle_no TEXT,
    stage TEXT DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, DISPATCH_READY, DISPATCHED, COMPLETED
    data JSONB, -- Stores full vehicle object with assignedOrderIds, attachments, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE IF EXISTS sales_dispatch_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow public read access on sales_dispatch_assignments" ON sales_dispatch_assignments;
CREATE POLICY "Allow public read access on sales_dispatch_assignments" ON sales_dispatch_assignments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public modification on sales_dispatch_assignments" ON sales_dispatch_assignments;
CREATE POLICY "Allow public modification on sales_dispatch_assignments" ON sales_dispatch_assignments
    FOR ALL USING (true) WITH CHECK (true);

-- Add to Realtime Publication (enable_realtime.sql logic needs update or run manually)
-- Since we can't edit the existing publication easily via SQL script without knowing its name or recreating it,
-- we'll assume 'supabase_realtime' exists and add table to it.
ALTER PUBLICATION supabase_realtime ADD TABLE sales_dispatch_assignments;
