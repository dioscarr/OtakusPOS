-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Create orders table with proper structure
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  table_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  itbis decimal(10,2) NOT NULL DEFAULT 0,
  tip decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  is_fiscal boolean NOT NULL DEFAULT false,
  fiscal_number text,
  payment_method text CHECK (payment_method IN ('cash', 'card')),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  food_ready boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table with proper structure
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX orders_employee_id_idx ON orders(employee_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_menu_item_id_idx ON order_items(menu_item_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Create function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal decimal(10,2);
  v_order_id uuid;
BEGIN
  -- Determine the order_id based on the operation
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(quantity * price), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = v_order_id;

  -- Update order totals
  UPDATE orders
  SET 
    subtotal = v_subtotal,
    itbis = v_subtotal * 0.18,
    tip = v_subtotal * 0.10,
    total = v_subtotal * 1.28
  WHERE id = v_order_id;

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger to update order totals when items change
CREATE TRIGGER update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_totals();

-- Create function to handle order creation
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_customer_name text,
  p_table_number integer,
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
  -- Create the order
  INSERT INTO orders (
    customer_name,
    table_number,
    status,
    employee_id
  ) VALUES (
    p_customer_name,
    p_table_number,
    'pending',
    p_employee_id
  ) RETURNING id INTO v_order_id;

  -- Insert order items
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
END;
$$;

-- Disable RLS for these tables since we're handling access control at the application level
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;
GRANT EXECUTE ON FUNCTION create_order_with_items(text, integer, uuid, jsonb) TO public;