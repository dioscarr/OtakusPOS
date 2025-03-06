-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Create orders table with proper structure
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  table_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
  subtotal decimal(10,2) NOT NULL,
  itbis decimal(10,2) NOT NULL,
  tip decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL,
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
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX orders_employee_id_idx ON orders(employee_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_menu_item_id_idx ON order_items(menu_item_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Disable RLS for these tables since we're handling access control at the application level
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO public;
GRANT ALL ON order_items TO public;