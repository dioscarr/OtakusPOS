-- First disable RLS temporarily
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "orders_policy" ON orders;
DROP POLICY IF EXISTS "order_items_policy" ON order_items;

-- Create single policy for all operations on orders
CREATE POLICY "enable_all_orders"
  ON orders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create single policy for all operations on order_items
CREATE POLICY "enable_all_order_items"
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