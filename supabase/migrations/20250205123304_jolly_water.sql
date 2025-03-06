/*
  # Simplify RLS policies for orders system

  1. Changes
    - Drop all existing policies
    - Create simplified RLS policies
    - Disable RLS temporarily to debug
  
  2. Security
    - Allow all operations for authenticated users
    - Public read access
*/

-- Disable RLS temporarily to debug
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access for orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Public read access for order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can update order_items" ON order_items;

-- Create single policy for orders
CREATE POLICY "orders_policy"
  ON orders
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (auth.role() = 'authenticated');

-- Create single policy for order_items
CREATE POLICY "order_items_policy"
  ON order_items
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT SELECT ON orders TO public;
GRANT SELECT ON order_items TO public;