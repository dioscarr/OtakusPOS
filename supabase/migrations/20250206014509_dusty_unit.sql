-- Improve RLS policies for orders
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;

CREATE POLICY "orders_select_policy"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "orders_insert_policy"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE shift_status = 'active'
    )
  );

CREATE POLICY "orders_update_policy"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE shift_status = 'active'
    )
  );

-- Improve RLS policies for order_items
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON order_items;

CREATE POLICY "order_items_select_policy"
  ON order_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "order_items_insert_policy"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE employee_id IN (
        SELECT id FROM employees 
        WHERE shift_status = 'active'
      )
    )
  );

CREATE POLICY "order_items_update_policy"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE employee_id IN (
        SELECT id FROM employees 
        WHERE shift_status = 'active'
      )
    )
  );

-- Create a function to handle order creation with items in a transaction
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_customer_name text,
  p_table_number integer,
  p_status text,
  p_subtotal decimal,
  p_itbis decimal,
  p_tip decimal,
  p_total decimal,
  p_is_fiscal boolean,
  p_fiscal_number text,
  p_payment_method text,
  p_employee_id uuid,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  -- Start transaction
  BEGIN
    -- Create order
    INSERT INTO orders (
      customer_name,
      table_number,
      status,
      subtotal,
      itbis,
      tip,
      total,
      is_fiscal,
      fiscal_number,
      payment_method,
      employee_id
    ) VALUES (
      p_customer_name,
      p_table_number,
      p_status,
      p_subtotal,
      p_itbis,
      p_tip,
      p_total,
      p_is_fiscal,
      p_fiscal_number,
      p_payment_method,
      p_employee_id
    ) RETURNING id INTO v_order_id;

    -- Create order items
    INSERT INTO order_items (
      order_id,
      menu_item_id,
      quantity,
      price
    )
    SELECT
      v_order_id,
      (item->>'menu_item_id')::uuid,
      (item->>'quantity')::integer,
      (item->>'price')::decimal
    FROM jsonb_array_elements(p_items) AS item;

    RETURN v_order_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$$;