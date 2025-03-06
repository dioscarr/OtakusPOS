-- First, disable RLS temporarily to ensure clean state
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON order_items;

-- Create new simplified policies for orders
CREATE POLICY "orders_select_policy"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "orders_insert_policy"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "orders_update_policy"
  ON orders
  FOR UPDATE
  TO public
  USING (true);

-- Create new simplified policies for order_items
CREATE POLICY "order_items_select_policy"
  ON order_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "order_items_insert_policy"
  ON order_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "order_items_update_policy"
  ON order_items
  FOR UPDATE
  TO public
  USING (true);

-- Re-enable RLS with the new policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to public
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;