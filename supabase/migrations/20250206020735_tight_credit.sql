-- Drop existing policies
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON order_items;

-- Create policies for orders
CREATE POLICY "orders_select"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "orders_insert"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "orders_update"
  ON orders
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "orders_delete"
  ON orders
  FOR DELETE
  TO public
  USING (true);

-- Create policies for order_items
CREATE POLICY "order_items_select"
  ON order_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "order_items_insert"
  ON order_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "order_items_update"
  ON order_items
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "order_items_delete"
  ON order_items
  FOR DELETE
  TO public
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;