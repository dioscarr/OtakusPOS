/*
  # Final RLS configuration for shifts table
  
  1. Changes
    - Drop all existing policies
    - Create simple policies that allow:
      - Public read access
      - Authenticated users to insert and update shifts
    - Keep RLS enabled
  
  2. Security
    - Anyone can read shifts
    - Only authenticated users can insert/update shifts
    - No complex conditions that could cause policy violations
*/

-- Drop all existing policies
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
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;