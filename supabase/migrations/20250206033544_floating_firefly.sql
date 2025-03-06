-- First disable RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "public_select_orders" ON orders;
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
DROP POLICY IF EXISTS "public_update_orders" ON orders;
DROP POLICY IF EXISTS "public_delete_orders" ON orders;

DROP POLICY IF EXISTS "public_select_order_items" ON order_items;
DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
DROP POLICY IF EXISTS "public_update_order_items" ON order_items;
DROP POLICY IF EXISTS "public_delete_order_items" ON order_items;

-- Create new simplified policies for orders
CREATE POLICY "orders_policy"
  ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new simplified policies for order_items
CREATE POLICY "order_items_policy"
  ON order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT SELECT ON orders TO public;
GRANT SELECT ON order_items TO public;