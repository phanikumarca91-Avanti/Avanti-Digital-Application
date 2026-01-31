-- Enable RLS on tables
ALTER TABLE IF EXISTS vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS master_data ENABLE ROW LEVEL SECURITY;

-- VEHICLES Table Policies
-- Allow Read Access to Everyone (Internal App)
CREATE POLICY "Allow public read access on vehicles" ON vehicles
    FOR SELECT USING (true);

-- Allow Insert/Update/Delete to Everyone (Internal App)
-- In a real production app, restrict this to authenticated users
CREATE POLICY "Allow public modification on vehicles" ON vehicles
    FOR ALL USING (true) WITH CHECK (true);


-- WAREHOUSE_STOCK Table Policies
CREATE POLICY "Allow public read access on warehouse_stock" ON warehouse_stock
    FOR SELECT USING (true);

CREATE POLICY "Allow public modification on warehouse_stock" ON warehouse_stock
    FOR ALL USING (true) WITH CHECK (true);


-- MASTER_DATA Table Policies
CREATE POLICY "Allow public read access on master_data" ON master_data
    FOR SELECT USING (true);

CREATE POLICY "Allow public modification on master_data" ON master_data
    FOR ALL USING (true) WITH CHECK (true);

-- Optional: Create tables if they don't exist (Idempotent)
CREATE TABLE IF NOT EXISTS vehicles (
    id BIGINT PRIMARY KEY,
    status TEXT,
    vehicle_number TEXT,
    type TEXT,
    data JSONB,
    logs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_stock (
    id TEXT PRIMARY KEY,
    data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_data (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
