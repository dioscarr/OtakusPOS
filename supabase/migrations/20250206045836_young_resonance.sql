-- First disable RLS temporarily
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE tabs DISABLE ROW LEVEL SECURITY;
ALTER TABLE tab_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_all_orders" ON orders;
DROP POLICY IF EXISTS "enable_all_order_items" ON order_items;
DROP POLICY IF EXISTS "enable_all_tabs" ON tabs;
DROP POLICY IF EXISTS "enable_all_tab_items" ON tab_items;

-- Create unrestricted policies for all tables
CREATE POLICY "unrestricted_orders"
  ON orders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "unrestricted_order_items"
  ON order_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "unrestricted_tabs"
  ON tabs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "unrestricted_tab_items"
  ON tab_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "unrestricted_employees"
  ON employees
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "unrestricted_shifts"
  ON shifts
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "unrestricted_menu_items"
  ON menu_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Re-enable RLS with unrestricted policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to public
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;
GRANT ALL ON tabs TO public;
GRANT ALL ON tab_items TO public;
GRANT ALL ON employees TO public;
GRANT ALL ON shifts TO public;
GRANT ALL ON menu_items TO public;