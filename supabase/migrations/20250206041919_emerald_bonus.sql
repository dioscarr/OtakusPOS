-- First disable RLS temporarily
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "public_orders_select" ON orders;
DROP POLICY IF EXISTS "public_orders_insert" ON orders;
DROP POLICY IF EXISTS "public_orders_update" ON orders;
DROP POLICY IF EXISTS "public_orders_delete" ON orders;
DROP POLICY IF EXISTS "public_order_items_select" ON order_items;
DROP POLICY IF EXISTS "public_order_items_insert" ON order_items;
DROP POLICY IF EXISTS "public_order_items_update" ON order_items;
DROP POLICY IF EXISTS "public_order_items_delete" ON order_items;

-- Create simplified policies for orders
CREATE POLICY "enable_all_for_orders"
  ON orders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create simplified policies for order_items
CREATE POLICY "enable_all_for_order_items"
  ON order_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;