-- First disable RLS to clean up
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_all_access_orders" ON orders;
DROP POLICY IF EXISTS "enable_all_access_order_items" ON order_items;

-- Create new public access policies for orders
CREATE POLICY "public_select_orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_insert_orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_update_orders"
  ON orders
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "public_delete_orders"
  ON orders
  FOR DELETE
  TO public
  USING (true);

-- Create new public access policies for order_items
CREATE POLICY "public_select_order_items"
  ON order_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_insert_order_items"
  ON order_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_update_order_items"
  ON order_items
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "public_delete_order_items"
  ON order_items
  FOR DELETE
  TO public
  USING (true);

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to public
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;