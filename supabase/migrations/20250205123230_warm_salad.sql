/*
  # Fix RLS policies for orders system

  1. Changes
    - Drop existing RLS policies
    - Create new comprehensive RLS policies for orders and order_items tables
    - Enable RLS on both tables
  
  2. Security
    - Public read access for all orders
    - Authenticated users can insert and update orders
    - Authenticated users can insert and update order items
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON orders;

DROP POLICY IF EXISTS "Enable read access for all users" ON order_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON order_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON order_items;

-- Create new policies for orders
CREATE POLICY "Public read access for orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create new policies for order_items
CREATE POLICY "Public read access for order_items"
  ON order_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert order_items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_items"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON orders TO public;
GRANT ALL ON orders TO authenticated;
GRANT SELECT ON order_items TO public;
GRANT ALL ON order_items TO authenticated;