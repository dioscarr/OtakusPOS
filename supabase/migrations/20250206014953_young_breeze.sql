-- Drop existing policies
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON order_items;

-- Create simplified policies for orders
CREATE POLICY "orders_select_policy"
  ON orders
  FOR SELECT
  USING (true);

CREATE POLICY "orders_insert_policy"
  ON orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "orders_update_policy"
  ON orders
  FOR UPDATE
  USING (true);

-- Create simplified policies for order_items
CREATE POLICY "order_items_select_policy"
  ON order_items
  FOR SELECT
  USING (true);

CREATE POLICY "order_items_insert_policy"
  ON order_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "order_items_update_policy"
  ON order_items
  FOR UPDATE
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT SELECT ON orders TO public;
GRANT SELECT ON order_items TO public;