/*
  # Update RLS policies for shifts table

  1. Changes
    - Drop existing complex policies
    - Create simplified policies that allow:
      - Public read access
      - Authenticated users to insert and update shifts
    - Keep RLS enabled for security
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON shifts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON shifts;

-- Create new simplified policies
CREATE POLICY "Enable read access for all users"
  ON shifts
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;