-- Drop existing policies
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update" ON order_items;

-- Create simplified policies for orders
CREATE POLICY "orders_select"
  ON orders
  FOR SELECT
  USING (true);

CREATE POLICY "orders_insert"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "orders_update"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create simplified policies for order_items
CREATE POLICY "order_items_select"
  ON order_items
  FOR SELECT
  USING (true);

CREATE POLICY "order_items_insert"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "order_items_update"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (true);

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT SELECT ON orders TO public;
GRANT SELECT ON order_items TO public;