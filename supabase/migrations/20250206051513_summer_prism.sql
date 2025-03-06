-- First disable RLS temporarily
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to ensure clean slate
DROP POLICY IF EXISTS "unrestricted_orders" ON orders;
DROP POLICY IF EXISTS "unrestricted_order_items" ON order_items;
DROP POLICY IF EXISTS "unrestricted_employees" ON employees;
DROP POLICY IF EXISTS "unrestricted_shifts" ON shifts;
DROP POLICY IF EXISTS "unrestricted_menu_items" ON menu_items;
DROP POLICY IF EXISTS "enable_all_orders" ON orders;
DROP POLICY IF EXISTS "enable_all_order_items" ON order_items;
DROP POLICY IF EXISTS "orders_policy" ON orders;
DROP POLICY IF EXISTS "order_items_policy" ON order_items;
DROP POLICY IF EXISTS "all_access_orders" ON orders;
DROP POLICY IF EXISTS "all_access_order_items" ON order_items;
DROP POLICY IF EXISTS "all_access_employees" ON employees;
DROP POLICY IF EXISTS "all_access_shifts" ON shifts;
DROP POLICY IF EXISTS "all_access_menu_items" ON menu_items;

-- Create new unrestricted policies with unique names
CREATE POLICY "public_access_all_orders"
  ON orders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_access_all_order_items"
  ON order_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_access_all_employees"
  ON employees
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_access_all_shifts"
  ON shifts
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_access_all_menu_items"
  ON menu_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to public
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;
GRANT ALL ON employees TO public;
GRANT ALL ON shifts TO public;
GRANT ALL ON menu_items TO public;