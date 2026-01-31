-- Create Users Table for Simple Auth
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Storing plain/simple hash for internal use as requested
    role TEXT NOT NULL, -- 'ADMIN', 'SECURITY', 'WEIGHBRIDGE', 'QC', 'STORE', 'PRODUCTION', 'SALES'
    full_name TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read their own user? Or actually for login, we need to select.
-- For simple table auth, we might need a public read policy or specific function.
-- Let's allow public read for now since it's an internal app table, or authenticated only?
-- Wait, if not logged in, we can't search.
-- We will use a "Service Role" or public policy for 'username' lookup during login.
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);

-- Insert Default Users
INSERT INTO users (username, password, role, full_name) VALUES
('admin', 'admin123', 'ADMIN', 'Super Admin'),
('security', 'sec123', 'SECURITY', 'Main Gate Security'),
('weigh', 'weigh123', 'WEIGHBRIDGE', 'Weighbridge Operator'),
('qc', 'qc123', 'QC', 'Quality Control Officer'),
('store', 'store123', 'STORE', 'Warehouse Manager'),
('prod', 'prod123', 'PRODUCTION', 'Production Manager'),
('sales', 'sales123', 'SALES', 'Sales Dispatcher')
ON CONFLICT (username) DO NOTHING;

-- Add to Realtime (Optional, for admin panel updates)
ALTER PUBLICATION supabase_realtime ADD TABLE users;
