-- First disable RLS temporarily
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update" ON order_items;
DROP POLICY IF EXISTS "order_items_delete" ON order_items;

-- Create new public policies for orders
CREATE POLICY "public_orders_select"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_orders_insert"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees
      WHERE shift_status = 'active'
    )
  );

CREATE POLICY "public_orders_update"
  ON orders
  FOR UPDATE
  TO public
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE shift_status = 'active'
    )
  );

CREATE POLICY "public_orders_delete"
  ON orders
  FOR DELETE
  TO public
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE shift_status = 'active'
    )
  );

-- Create new public policies for order_items
CREATE POLICY "public_order_items_select"
  ON order_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_order_items_insert"
  ON order_items
  FOR INSERT
  TO public
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE employee_id IN (
        SELECT id FROM employees
        WHERE shift_status = 'active'
      )
    )
  );

CREATE POLICY "public_order_items_update"
  ON order_items
  FOR UPDATE
  TO public
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE employee_id IN (
        SELECT id FROM employees
        WHERE shift_status = 'active'
      )
    )
  );

CREATE POLICY "public_order_items_delete"
  ON order_items
  FOR DELETE
  TO public
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE employee_id IN (
        SELECT id FROM employees
        WHERE shift_status = 'active'
      )
    )
  );

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;