-- First disable RLS temporarily
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "orders_policy" ON orders;
DROP POLICY IF EXISTS "order_items_policy" ON order_items;

-- Create new simplified policies for orders
CREATE POLICY "orders_select"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "orders_insert"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    employee_id IN (
      SELECT id FROM employees
      WHERE shift_status = 'active'
    )
  );

CREATE POLICY "orders_update"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    employee_id IN (
      SELECT id FROM employees
      WHERE shift_status = 'active'
    )
  );

CREATE POLICY "orders_delete"
  ON orders
  FOR DELETE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    employee_id IN (
      SELECT id FROM employees
      WHERE shift_status = 'active'
    )
  );

-- Create new simplified policies for order_items
CREATE POLICY "order_items_select"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "order_items_insert"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    order_id IN (
      SELECT id FROM orders
      WHERE employee_id IN (
        SELECT id FROM employees
        WHERE shift_status = 'active'
      )
    )
  );

CREATE POLICY "order_items_update"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    order_id IN (
      SELECT id FROM orders
      WHERE employee_id IN (
        SELECT id FROM employees
        WHERE shift_status = 'active'
      )
    )
  );

CREATE POLICY "order_items_delete"
  ON order_items
  FOR DELETE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
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
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;