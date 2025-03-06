/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `customer_name` (text)
      - `table_number` (integer)
      - `status` (text: pending, paid, cancelled)
      - `subtotal` (decimal)
      - `itbis` (decimal)
      - `tip` (decimal)
      - `total` (decimal)
      - `is_fiscal` (boolean)
      - `fiscal_number` (text, optional)
      - `payment_method` (text: cash, card)
      - `employee_id` (uuid, references employees)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `menu_item_id` (uuid, references menu_items)
      - `quantity` (integer)
      - `price` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow public read access
    - Allow authenticated users to manage orders
*/

-- Create orders table
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX orders_employee_id_idx ON orders(employee_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Enable read access for all users"
  ON orders
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for order_items
CREATE POLICY "Enable read access for all users"
  ON order_items
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (true);