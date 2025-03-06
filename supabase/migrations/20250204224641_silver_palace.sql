/*
  # Fix RLS policies for shifts table

  1. Changes
    - Drop existing policies
    - Create new simplified policies that allow authenticated users to manage shifts
    - Keep public read access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access for shifts" ON shifts;
DROP POLICY IF EXISTS "Employees can manage shifts" ON shifts;

-- Create new simplified policies
CREATE POLICY "Allow public read access"
  ON shifts
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage shifts"
  ON shifts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;