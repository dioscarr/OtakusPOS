/*
  # Fix RLS policies for shifts table

  1. Changes
    - Drop existing policies
    - Create new simplified policies that allow authenticated users to manage shifts
    - Keep RLS enabled but with proper permissions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to manage shifts" ON shifts;

-- Create new simplified policies
CREATE POLICY "Enable read access for all users"
  ON shifts
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    employee_id IS NOT NULL
  );

CREATE POLICY "Enable update for authenticated users"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    employee_id IS NOT NULL
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    employee_id IS NOT NULL
  );

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;