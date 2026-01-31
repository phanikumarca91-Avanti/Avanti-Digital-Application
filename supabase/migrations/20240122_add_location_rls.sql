-- Multi-Location Row Level Security Migration
-- Adds location_id to all major tables and creates RLS policies for data isolation

-- =====================================================
-- PHASE 1: Add location_id columns to existing tables
-- =====================================================

-- Add location_id to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'LOC001';

-- Add location_id to warehouse_stock table
ALTER TABLE warehouse_stock 
ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'LOC001';

-- Add location_id to production_lots table
ALTER TABLE production_lots 
ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'LOC001';

-- Add location_id to sales_orders table
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'LOC001';

-- Add location_id to sales_invoices table
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'LOC001';

-- Add location_id to sales_dispatch_assignments table
ALTER TABLE sales_dispatch_assignments 
ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'LOC001';

-- Add location_id to master_data table
ALTER TABLE master_data 
ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'LOC001';

-- Add assigned_location_id to users table (where users are permanently assigned)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assigned_location_id TEXT DEFAULT 'LOC001';

-- =====================================================
-- PHASE 2: Create session management function
-- =====================================================

CREATE OR REPLACE FUNCTION set_session_location(loc_id TEXT, user_role TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_location_id', loc_id, false);
  PERFORM set_config('app.user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PHASE 3: Create RLS Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_dispatch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "location_select_policy" ON vehicles;
DROP POLICY IF EXISTS "location_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "location_update_policy" ON vehicles;
DROP POLICY IF EXISTS "location_delete_policy" ON vehicles;

DROP POLICY IF EXISTS "location_select_policy" ON warehouse_stock;
DROP POLICY IF EXISTS "location_insert_policy" ON warehouse_stock;
DROP POLICY IF EXISTS "location_update_policy" ON warehouse_stock;
DROP POLICY IF EXISTS "location_delete_policy" ON warehouse_stock;

DROP POLICY IF EXISTS "location_select_policy" ON production_lots;
DROP POLICY IF EXISTS "location_insert_policy" ON production_lots;
DROP POLICY IF EXISTS "location_update_policy" ON production_lots;
DROP POLICY IF EXISTS "location_delete_policy" ON production_lots;

DROP POLICY IF EXISTS "location_select_policy" ON sales_orders;
DROP POLICY IF EXISTS "location_insert_policy" ON sales_orders;
DROP POLICY IF EXISTS "location_update_policy" ON sales_orders;
DROP POLICY IF EXISTS "location_delete_policy" ON sales_orders;

DROP POLICY IF EXISTS "location_select_policy" ON sales_invoices;
DROP POLICY IF EXISTS "location_insert_policy" ON sales_invoices;
DROP POLICY IF EXISTS "location_update_policy" ON sales_invoices;
DROP POLICY IF EXISTS "location_delete_policy" ON sales_invoices;

DROP POLICY IF EXISTS "location_select_policy" ON sales_dispatch_assignments;
DROP POLICY IF EXISTS "location_insert_policy" ON sales_dispatch_assignments;
DROP POLICY IF EXISTS "location_update_policy" ON sales_dispatch_assignments;
DROP POLICY IF EXISTS "location_delete_policy" ON sales_dispatch_assignments;

DROP POLICY IF EXISTS "location_select_policy" ON master_data;
DROP POLICY IF EXISTS "location_insert_policy" ON master_data;
DROP POLICY IF EXISTS "location_update_policy" ON master_data;
DROP POLICY IF EXISTS "location_delete_policy" ON master_data;

-- Vehicles Table Policies
CREATE POLICY "location_select_policy" ON vehicles
  FOR SELECT USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_insert_policy" ON vehicles
  FOR INSERT WITH CHECK (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_update_policy" ON vehicles
  FOR UPDATE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_delete_policy" ON vehicles
  FOR DELETE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

-- Warehouse Stock Table Policies
CREATE POLICY "location_select_policy" ON warehouse_stock
  FOR SELECT USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_insert_policy" ON warehouse_stock
  FOR INSERT WITH CHECK (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_update_policy" ON warehouse_stock
  FOR UPDATE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_delete_policy" ON warehouse_stock
  FOR DELETE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

-- Production Lots Table Policies
CREATE POLICY "location_select_policy" ON production_lots
  FOR SELECT USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_insert_policy" ON production_lots
  FOR INSERT WITH CHECK (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_update_policy" ON production_lots
  FOR UPDATE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_delete_policy" ON production_lots
  FOR DELETE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

-- Sales Orders Table Policies
CREATE POLICY "location_select_policy" ON sales_orders
  FOR SELECT USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_insert_policy" ON sales_orders
  FOR INSERT WITH CHECK (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_update_policy" ON sales_orders
  FOR UPDATE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_delete_policy" ON sales_orders
  FOR DELETE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

-- Sales Invoices Table Policies
CREATE POLICY "location_select_policy" ON sales_invoices
  FOR SELECT USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_insert_policy" ON sales_invoices
  FOR INSERT WITH CHECK (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_update_policy" ON sales_invoices
  FOR UPDATE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_delete_policy" ON sales_invoices
  FOR DELETE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

-- Sales Dispatch Assignments Table Policies
CREATE POLICY "location_select_policy" ON sales_dispatch_assignments
  FOR SELECT USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_insert_policy" ON sales_dispatch_assignments
  FOR INSERT WITH CHECK (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_update_policy" ON sales_dispatch_assignments
  FOR UPDATE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_delete_policy" ON sales_dispatch_assignments
  FOR DELETE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

-- Master Data Table Policies
CREATE POLICY "location_select_policy" ON master_data
  FOR SELECT USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_insert_policy" ON master_data
  FOR INSERT WITH CHECK (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_update_policy" ON master_data
  FOR UPDATE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

CREATE POLICY "location_delete_policy" ON master_data
  FOR DELETE USING (
    location_id = current_setting('app.current_location_id', true)
    OR current_setting('app.user_role', true) = 'ADMIN'
  );

-- =====================================================
-- PHASE 4: Create Performance Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_location ON warehouse_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_production_lots_location ON production_lots(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_location ON sales_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_location ON sales_invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_dispatch_location ON sales_dispatch_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_master_data_location ON master_data(location_id);
CREATE INDEX IF NOT EXISTS idx_users_assigned_location ON users(assigned_location_id);

-- =====================================================
-- PHASE 5: Grant necessary permissions
-- =====================================================

-- Grant execute permission on the session management function
GRANT EXECUTE ON FUNCTION set_session_location(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_session_location(TEXT, TEXT) TO anon;
