-- Drop existing policies
DROP POLICY IF EXISTS "orders_policy" ON orders;
DROP POLICY IF EXISTS "order_items_policy" ON order_items;

-- Create separate policies for orders
CREATE POLICY "orders_select"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "orders_insert"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees
    )
  );

CREATE POLICY "orders_update"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees
    )
  );

-- Create separate policies for order_items
CREATE POLICY "order_items_select"
  ON order_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "order_items_insert"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
    )
  );

CREATE POLICY "order_items_update"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
    )
  );

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT SELECT ON orders TO public;
GRANT SELECT ON order_items TO public;