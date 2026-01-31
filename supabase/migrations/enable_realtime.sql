-- Enable Realtime for Sales and Production Tables
-- Run this in the Supabase SQL Editor

begin;
  -- Check if publication exists (it usually does by default)
  -- We add tables to the 'supabase_realtime' publication to enable listening for changes
  
  -- 1. Sales Tables
  alter publication supabase_realtime add table sales_orders;
  alter publication supabase_realtime add table sales_invoices;
  
  -- 2. Production Tables
  alter publication supabase_realtime add table production_lots;
  
  -- 3. Warehouse Stock (if not already enabled)
  alter publication supabase_realtime add table warehouse_stock;

commit;
