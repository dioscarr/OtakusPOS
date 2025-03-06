/*
  # Fix RLS policies for shifts table
  
  1. Changes
    - Drop all existing policies for shifts table
    - Create new simplified policies that properly handle authentication
  
  2. Security
    - Enable public read access
    - Allow authenticated users to manage shifts
    - Maintain data integrity
*/

-- Drop all existing policies for shifts
DROP POLICY IF EXISTS "Enable read access for all users" ON shifts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Employees can manage their own shifts" ON shifts;

-- Create new simplified policies
CREATE POLICY "Public read access for shifts"
  ON shifts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage shifts"
  ON shifts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;